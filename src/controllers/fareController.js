const { Fare, Order } = require('../models');

// Record fare for an order
const recordFare = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fareType, amount, notes } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if fare already exists for this order
    const existingFare = await Fare.findOne({ orderId });
    if (existingFare) {
      return res.status(400).json({ 
        message: 'Fare already recorded for this order. Use update endpoint to modify.' 
      });
    }

    // Create fare record
    const fare = new Fare({
      orderNumber: order.orderNumber,
      orderId: order._id,
      fareType,
      amount,
      vehicleNumber: order.vehicle?.number || 'N/A',
      driverName: order.vehicle?.driverName || 'N/A',
      customerOrSupplier: order.customerOrSupplier,
      notes,
      recordedBy: req.user._id
    });

    await fare.save();

    // Add to order history
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: `Fare recorded: ₹${amount} (${fareType.replace('_', ' ')})`,
      at: new Date()
    });

    await order.save();

    // Populate for response
    await fare.populate('recordedBy', 'name alias');

    res.status(201).json({
      message: 'Fare recorded successfully',
      fare
    });

  } catch (error) {
    console.error('Record fare error:', error);
    res.status(500).json({ message: 'Server error recording fare' });
  }
};

// Get all fares with pagination and filters
const getFares = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      fareType,
      search,
      startDate,
      endDate
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    if (fareType && fareType !== 'all') {
      filter.fareType = fareType;
    }
    
    if (search) {
      filter.$or = [
        { customerOrSupplier: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { orderNumber: parseInt(search) || 0 }
      ];
    }

    if (startDate || endDate) {
      filter.recordedAt = {};
      if (startDate) filter.recordedAt.$gte = new Date(startDate);
      if (endDate) filter.recordedAt.$lte = new Date(endDate);
    }

    const fares = await Fare.find(filter)
      .populate('recordedBy', 'name alias')
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Fare.countDocuments(filter);

    res.json({
      fares,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get fares error:', error);
    res.status(500).json({ message: 'Server error fetching fares' });
  }
};

// Get fare by order ID
const getFareByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const fare = await Fare.findOne({ orderId })
      .populate('recordedBy', 'name alias');

    if (!fare) {
      return res.status(404).json({ message: 'Fare not found for this order' });
    }

    res.json(fare);

  } catch (error) {
    console.error('Get fare by order ID error:', error);
    res.status(500).json({ message: 'Server error fetching fare' });
  }
};

// Update fare
const updateFare = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fareType, amount, notes } = req.body;

    const fare = await Fare.findOne({ orderId });
    if (!fare) {
      return res.status(404).json({ message: 'Fare not found for this order' });
    }

    // Update fare
    fare.fareType = fareType;
    fare.amount = amount;
    fare.notes = notes;
    
    await fare.save();

    // Add to order history
    const order = await Order.findById(orderId);
    if (order) {
      order.history.push({
        by: req.user._id,
        from: order.status,
        to: order.status,
        note: `Fare updated: ₹${amount} (${fareType.replace('_', ' ')})`,
        at: new Date()
      });
      await order.save();
    }

    // Populate for response
    await fare.populate('recordedBy', 'name alias');

    res.json({
      message: 'Fare updated successfully',
      fare
    });

  } catch (error) {
    console.error('Update fare error:', error);
    res.status(500).json({ message: 'Server error updating fare' });
  }
};

// Delete fare
const deleteFare = async (req, res) => {
  try {
    const { orderId } = req.params;

    const fare = await Fare.findOneAndDelete({ orderId });
    if (!fare) {
      return res.status(404).json({ message: 'Fare not found for this order' });
    }

    // Add to order history
    const order = await Order.findById(orderId);
    if (order) {
      order.history.push({
        by: req.user._id,
        from: order.status,
        to: order.status,
        note: 'Fare record deleted',
        at: new Date()
      });
      await order.save();
    }

    res.json({
      message: 'Fare deleted successfully'
    });

  } catch (error) {
    console.error('Delete fare error:', error);
    res.status(500).json({ message: 'Server error deleting fare' });
  }
};

// Get fare statistics
const getFareStats = async (req, res) => {
  try {
    const stats = await Fare.aggregate([
      {
        $group: {
          _id: '$fareType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const totalFares = await Fare.countDocuments();
    const totalAmount = await Fare.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      stats,
      totalFares,
      totalAmount: totalAmount[0]?.total || 0
    });

  } catch (error) {
    console.error('Get fare stats error:', error);
    res.status(500).json({ message: 'Server error fetching fare statistics' });
  }
};

module.exports = {
  recordFare,
  getFares,
  getFareByOrderId,
  updateFare,
  deleteFare,
  getFareStats
};