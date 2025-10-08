const { StoreIssuance, Inventory } = require('../models');

// Issue store item
const issueStoreItem = async (req, res) => {
  try {
    const { issuedTo, item, purpose, department, employeeId, returnExpected, returnDate, remarks } = req.body;

    // Check if item exists in store inventory
    const inventoryItem = await Inventory.findOne({ 
      name: item.name,
      type: 'store_item'
    });

    if (inventoryItem) {
      // Check if sufficient quantity is available
      if (inventoryItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}` 
        });
      }

      // Reduce inventory quantity
      inventoryItem.quantity -= item.quantity;
      inventoryItem.lastUpdatedBy = req.user._id;
      await inventoryItem.save();
    }

    // Create store issuance record
    const issuance = new StoreIssuance({
      issuedBy: req.user._id,
      issuedTo,
      item,
      purpose,
      department,
      employeeId,
      returnExpected: returnExpected || false,
      returnDate: returnExpected ? returnDate : null,
      remarks
    });

    await issuance.save();

    // Populate the issuedBy field for response
    await issuance.populate('issuedBy', 'name alias role');

    res.status(201).json({
      message: 'Item issued',
      record: issuance
    });

  } catch (error) {
    console.error('Issue store item error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error issuing store item' });
  }
};

// Return store item
const returnStoreItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnedQuantity, remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (!issuance.returnExpected) {
      return res.status(400).json({ message: 'This item was not expected to be returned' });
    }

    if (issuance.returned) {
      return res.status(400).json({ message: 'Item has already been returned' });
    }

    if (returnedQuantity > issuance.item.quantity) {
      return res.status(400).json({ 
        message: `Cannot return more than issued. Issued: ${issuance.item.quantity}, Returning: ${returnedQuantity}` 
      });
    }

    // Update issuance record
    issuance.returned = true;
    issuance.returnedQuantity = returnedQuantity;
    issuance.remarks = remarks || issuance.remarks;

    await issuance.save();

    // Update inventory if item exists
    const inventoryItem = await Inventory.findOne({ 
      name: issuance.item.name,
      type: 'store_item'
    });

    if (inventoryItem) {
      inventoryItem.quantity += returnedQuantity;
      inventoryItem.lastUpdatedBy = req.user._id;
      await inventoryItem.save();
    }

    // Populate the issuedBy field for response
    await issuance.populate('issuedBy', 'name alias role');

    res.status(200).json({
      message: 'Item returned successfully',
      record: issuance
    });

  } catch (error) {
    console.error('Return store item error:', error);
    res.status(500).json({ message: 'Server error returning store item' });
  }
};

// Get store issuances with filters
const getStoreIssuances = async (req, res) => {
  try {
    const { 
      issuedTo, 
      department, 
      returnExpected, 
      returned, 
      startDate, 
      endDate, 
      page = 1, 
      perPage = 25 
    } = req.query;

    // Build filter object
    const filter = {};
    if (issuedTo) filter.issuedTo = { $regex: issuedTo, $options: 'i' };
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (returnExpected !== undefined) filter.returnExpected = returnExpected === 'true';
    if (returned !== undefined) filter.returned = returned === 'true';
    
    if (startDate || endDate) {
      filter.dateIssued = {};
      if (startDate) filter.dateIssued.$gte = new Date(startDate);
      if (endDate) filter.dateIssued.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * perPage;

    // Get issuances
    const issuances = await StoreIssuance.find(filter)
      .sort({ dateIssued: -1 })
      .skip(skip)
      .limit(parseInt(perPage))
      .populate('issuedBy', 'name alias role')
      .lean();

    // Get total count for pagination info
    const totalCount = await StoreIssuance.countDocuments(filter);

    res.status(200).json({
      issuances,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage)
      }
    });

  } catch (error) {
    console.error('Get store issuances error:', error);
    res.status(500).json({ message: 'Server error retrieving store issuances' });
  }
};

// Get pending returns
const getPendingReturns = async (req, res) => {
  try {
    const pendingReturns = await StoreIssuance.find({
      returnExpected: true,
      returned: false,
      returnDate: { $lte: new Date() } // Past due returns
    })
      .sort({ returnDate: 1 })
      .populate('issuedBy', 'name alias role')
      .lean();

    res.status(200).json({
      message: 'Pending returns retrieved',
      pendingReturns,
      count: pendingReturns.length
    });

  } catch (error) {
    console.error('Get pending returns error:', error);
    res.status(500).json({ message: 'Server error retrieving pending returns' });
  }
};

// Get store issuance by ID
const getStoreIssuanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const issuance = await StoreIssuance.findById(id)
      .populate('issuedBy', 'name alias role');

    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    res.status(200).json({
      message: 'Store issuance retrieved',
      record: issuance
    });

  } catch (error) {
    console.error('Get store issuance by ID error:', error);
    res.status(500).json({ message: 'Server error retrieving store issuance' });
  }
};

// Get issuance statistics
const getIssuanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.dateIssued = {};
      if (startDate) dateFilter.dateIssued.$gte = new Date(startDate);
      if (endDate) dateFilter.dateIssued.$lte = new Date(endDate);
    }

    // Get aggregated stats
    const stats = await StoreIssuance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalIssuances: { $sum: 1 },
          totalQuantityIssued: { $sum: '$item.quantity' },
          returnsExpected: { $sum: { $cond: ['$returnExpected', 1, 0] } },
          returnsCompleted: { $sum: { $cond: ['$returned', 1, 0] } }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalIssuances: 0,
      totalQuantityIssued: 0,
      returnsExpected: 0,
      returnsCompleted: 0
    };

    // Calculate pending returns
    result.pendingReturns = result.returnsExpected - result.returnsCompleted;

    res.status(200).json({
      message: 'Issuance statistics retrieved',
      stats: result
    });

  } catch (error) {
    console.error('Get issuance stats error:', error);
    res.status(500).json({ message: 'Server error retrieving issuance statistics' });
  }
};

module.exports = {
  issueStoreItem,
  returnStoreItem,
  getStoreIssuances,
  getPendingReturns,
  getStoreIssuanceById,
  getIssuanceStats
};
