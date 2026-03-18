const { StoreIssuance, Inventory } = require('../models');

const appendHistory = (issuance, userId, action, fromStatus, toStatus, note) => {
  issuance.history.push({
    by: userId,
    action,
    fromStatus,
    toStatus,
    note,
    at: new Date(),
  });
};

const getStoreInventoryItem = async (name) => {
  return Inventory.findOne({
    name,
    type: 'store_item',
  });
};

const populateIssuance = async (issuance) => {
  await issuance.populate('issuedBy', 'name alias role');
  await issuance.populate('approvedBy', 'name alias role');
  await issuance.populate('rejectedBy', 'name alias role');
  await issuance.populate('history.by', 'name alias role');
  return issuance;
};

// Raise store request
const issueStoreItem = async (req, res) => {
  try {
    const {
      issuedTo,
      item,
      purpose,
      department,
      employeeId,
      returnExpected,
      returnDate,
      remarks,
    } = req.body;

    const issuance = new StoreIssuance({
      issuedBy: req.user._id,
      issuedTo,
      item,
      purpose,
      department,
      employeeId,
      returnExpected: Boolean(returnExpected),
      returnDate: returnExpected ? returnDate : null,
      status: 'raised',
      remarks,
      history: [],
    });

    appendHistory(
      issuance,
      req.user._id,
      'request_raised',
      null,
      'raised',
      remarks || 'Store request raised'
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(201).json({
      message: 'Store request raised',
      record: issuance,
    });
  } catch (error) {
    console.error('Raise store request error:', error);
    res.status(500).json({ message: 'Server error raising store request' });
  }
};

// Approve raised request
const approveStoreIssuance = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedQuantity, remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'raised') {
      return res.status(400).json({ message: `Only raised requests can be approved. Current status: ${issuance.status}` });
    }

    if (approvedQuantity > issuance.item.quantity) {
      return res.status(400).json({
        message: `Approved quantity cannot exceed requested quantity (${issuance.item.quantity})`,
      });
    }

    const inventoryItem = await getStoreInventoryItem(issuance.item.name);
    if (!inventoryItem || inventoryItem.quantity < approvedQuantity) {
      return res.status(400).json({
        message: `Insufficient stock for approval. Available: ${inventoryItem ? inventoryItem.quantity : 0}, Required: ${approvedQuantity}`,
      });
    }

    const previousStatus = issuance.status;
    issuance.status = 'approved';
    issuance.approvedBy = req.user._id;
    issuance.approvedAt = new Date();
    issuance.approvedQuantity = approvedQuantity;
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'request_approved',
      previousStatus,
      'approved',
      remarks || `Approved quantity: ${approvedQuantity}`
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Store request approved',
      record: issuance,
    });
  } catch (error) {
    console.error('Approve store request error:', error);
    res.status(500).json({ message: 'Server error approving store request' });
  }
};

// Reject raised request
const rejectStoreIssuance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'raised') {
      return res.status(400).json({ message: `Only raised requests can be rejected. Current status: ${issuance.status}` });
    }

    const previousStatus = issuance.status;
    issuance.status = 'rejected';
    issuance.rejectedBy = req.user._id;
    issuance.rejectedAt = new Date();
    issuance.rejectionReason = reason;
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'request_rejected',
      previousStatus,
      'rejected',
      reason
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Store request rejected',
      record: issuance,
    });
  } catch (error) {
    console.error('Reject store request error:', error);
    res.status(500).json({ message: 'Server error rejecting store request' });
  }
};

// Issue approved request (deduct inventory)
const issueApprovedStoreItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'approved') {
      return res.status(400).json({ message: `Only approved requests can be issued. Current status: ${issuance.status}` });
    }

    const quantityToIssue = issuance.approvedQuantity || issuance.item.quantity;

    const inventoryItem = await getStoreInventoryItem(issuance.item.name);
    if (!inventoryItem || inventoryItem.quantity < quantityToIssue) {
      return res.status(400).json({
        message: `Insufficient stock at issue time. Available: ${inventoryItem ? inventoryItem.quantity : 0}, Required: ${quantityToIssue}`,
      });
    }

    inventoryItem.quantity -= quantityToIssue;
    inventoryItem.lastUpdatedBy = req.user._id;
    await inventoryItem.save();

    const previousStatus = issuance.status;
    issuance.status = 'issued';
    issuance.issuedAt = new Date();
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'item_issued',
      previousStatus,
      'issued',
      remarks || `Issued quantity: ${quantityToIssue}`
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Store item issued',
      record: issuance,
    });
  } catch (error) {
    console.error('Issue approved store request error:', error);
    res.status(500).json({ message: 'Server error issuing approved request' });
  }
};

// Mark issued item returned (add back inventory)
const returnStoreItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, returnedQuantity, remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'issued') {
      return res.status(400).json({ message: `Only issued requests can be returned. Current status: ${issuance.status}` });
    }

    const maxQuantity = issuance.approvedQuantity || issuance.item.quantity;
    const quantityToReturn = quantity || returnedQuantity || maxQuantity;

    if (quantityToReturn > maxQuantity) {
      return res.status(400).json({
        message: `Cannot return more than issued quantity (${maxQuantity})`,
      });
    }

    const inventoryItem = await getStoreInventoryItem(issuance.item.name);
    if (inventoryItem) {
      inventoryItem.quantity += quantityToReturn;
      inventoryItem.lastUpdatedBy = req.user._id;
      await inventoryItem.save();
    }

    const previousStatus = issuance.status;
    issuance.status = 'returned';
    issuance.returned = true;
    issuance.returnedQuantity = quantityToReturn;
    issuance.returnedAt = new Date();
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'item_returned',
      previousStatus,
      'returned',
      remarks || `Returned quantity: ${quantityToReturn}`
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Item returned successfully',
      record: issuance,
    });
  } catch (error) {
    console.error('Return store item error:', error);
    res.status(500).json({ message: 'Server error returning store item' });
  }
};

// Mark issued item under repair
const markStoreItemUnderRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'issued') {
      return res.status(400).json({ message: `Only issued requests can move to under_repair. Current status: ${issuance.status}` });
    }

    const previousStatus = issuance.status;
    issuance.status = 'under_repair';
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'item_under_repair',
      previousStatus,
      'under_repair',
      remarks || 'Item moved to under repair'
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Item marked under repair',
      record: issuance,
    });
  } catch (error) {
    console.error('Mark under repair error:', error);
    res.status(500).json({ message: 'Server error marking item under repair' });
  }
};

// Mark repaired and add inventory back
const markStoreItemRepaired = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (issuance.status !== 'under_repair') {
      return res.status(400).json({ message: `Only under_repair requests can be marked repaired. Current status: ${issuance.status}` });
    }

    const maxQuantity = issuance.approvedQuantity || issuance.item.quantity;
    const repairedQuantity = quantity || maxQuantity;

    if (repairedQuantity > maxQuantity) {
      return res.status(400).json({
        message: `Repaired quantity cannot exceed issued quantity (${maxQuantity})`,
      });
    }

    const inventoryItem = await getStoreInventoryItem(issuance.item.name);
    if (inventoryItem) {
      inventoryItem.quantity += repairedQuantity;
      inventoryItem.lastUpdatedBy = req.user._id;
      await inventoryItem.save();
    }

    const previousStatus = issuance.status;
    issuance.status = 'repaired';
    issuance.repairedAt = new Date();
    issuance.returned = true;
    issuance.returnedQuantity = repairedQuantity;
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'item_repaired',
      previousStatus,
      'repaired',
      remarks || `Repaired quantity: ${repairedQuantity}`
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Item marked repaired',
      record: issuance,
    });
  } catch (error) {
    console.error('Mark repaired error:', error);
    res.status(500).json({ message: 'Server error marking item repaired' });
  }
};

// Mark scrapped (no inventory return)
const markStoreItemScrapped = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const issuance = await StoreIssuance.findById(id);
    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    if (!['issued', 'under_repair'].includes(issuance.status)) {
      return res.status(400).json({ message: `Only issued/under_repair requests can be scrapped. Current status: ${issuance.status}` });
    }

    const previousStatus = issuance.status;
    issuance.status = 'scrapped';
    issuance.scrappedAt = new Date();
    issuance.remarks = remarks || issuance.remarks;

    appendHistory(
      issuance,
      req.user._id,
      'item_scrapped',
      previousStatus,
      'scrapped',
      remarks || 'Item scrapped/deprecated'
    );

    await issuance.save();
    await populateIssuance(issuance);

    res.status(200).json({
      message: 'Item marked scrapped',
      record: issuance,
    });
  } catch (error) {
    console.error('Mark scrapped error:', error);
    res.status(500).json({ message: 'Server error marking item scrapped' });
  }
};

// Get store issuances with filters
const getStoreIssuances = async (req, res) => {
  try {
    const {
      issuedTo,
      department,
      status,
      returnExpected,
      startDate,
      endDate,
      page = 1,
      perPage = 25,
    } = req.query;

    const filter = {};
    if (issuedTo) filter.issuedTo = { $regex: issuedTo, $options: 'i' };
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (status) filter.status = status;
    if (returnExpected !== undefined) filter.returnExpected = returnExpected === true || returnExpected === 'true';

    if (startDate || endDate) {
      filter.dateIssued = {};
      if (startDate) filter.dateIssued.$gte = new Date(startDate);
      if (endDate) filter.dateIssued.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(perPage);

    const issuances = await StoreIssuance.find(filter)
      .sort({ dateIssued: -1 })
      .skip(skip)
      .limit(Number(perPage))
      .populate('issuedBy', 'name alias role')
      .populate('approvedBy', 'name alias role')
      .populate('rejectedBy', 'name alias role')
      .lean();

    const totalCount = await StoreIssuance.countDocuments(filter);

    res.status(200).json({
      issuances,
      pagination: {
        page: Number(page),
        perPage: Number(perPage),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(perPage)),
      },
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
      status: 'issued',
      returnExpected: true,
      returnDate: { $lte: new Date() },
    })
      .sort({ returnDate: 1 })
      .populate('issuedBy', 'name alias role')
      .lean();

    res.status(200).json({
      message: 'Pending returns retrieved',
      pendingReturns,
      count: pendingReturns.length,
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
      .populate('issuedBy', 'name alias role')
      .populate('approvedBy', 'name alias role')
      .populate('rejectedBy', 'name alias role')
      .populate('history.by', 'name alias role');

    if (!issuance) {
      return res.status(404).json({ message: 'Store issuance record not found' });
    }

    res.status(200).json({
      message: 'Store issuance retrieved',
      record: issuance,
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

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.dateIssued = {};
      if (startDate) dateFilter.dateIssued.$gte = new Date(startDate);
      if (endDate) dateFilter.dateIssued.$lte = new Date(endDate);
    }

    const statusCounts = await StoreIssuance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = await StoreIssuance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalRequestedQuantity: { $sum: '$item.quantity' },
          totalApprovedQuantity: { $sum: '$approvedQuantity' },
          totalReturnedQuantity: { $sum: '$returnedQuantity' },
        },
      },
    ]);

    const statusMap = {
      raised: 0,
      approved: 0,
      rejected: 0,
      issued: 0,
      returned: 0,
      under_repair: 0,
      repaired: 0,
      scrapped: 0,
    };

    statusCounts.forEach((entry) => {
      statusMap[entry._id] = entry.count;
    });

    const base = totals[0] || {
      totalRequests: 0,
      totalRequestedQuantity: 0,
      totalApprovedQuantity: 0,
      totalReturnedQuantity: 0,
    };

    res.status(200).json({
      message: 'Issuance statistics retrieved',
      stats: {
        ...base,
        statusCounts: statusMap,
      },
    });
  } catch (error) {
    console.error('Get issuance stats error:', error);
    res.status(500).json({ message: 'Server error retrieving issuance statistics' });
  }
};

module.exports = {
  issueStoreItem,
  approveStoreIssuance,
  rejectStoreIssuance,
  issueApprovedStoreItem,
  returnStoreItem,
  markStoreItemUnderRepair,
  markStoreItemRepaired,
  markStoreItemScrapped,
  getStoreIssuances,
  getPendingReturns,
  getStoreIssuanceById,
  getIssuanceStats,
};
