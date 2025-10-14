const { NeededItem, Inventory, Order } = require('../models');

// Get all needed items with filtering and pagination
const getNeededItems = async (req, res) => {
  try {
    const { 
      status = 'all', 
      priority = 'all', 
      page = 1, 
      limit = 50,
      orderId,
      canFulfill = 'all'
    } = req.query;
    
    let filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (priority !== 'all') {
      filter.priority = priority;
    }
    
    if (orderId) {
      filter['orderReference.orderId'] = orderId;
    }

    const skip = (page - 1) * limit;
    
    let neededItems = await NeededItem.find(filter)
      .populate('inventoryItemId', 'name type dimensions quantity availableQuantity status')
      .populate('orderReference.orderId', 'orderNumber status type customerOrSupplier')
      .populate('createdBy', 'name alias')
      .populate('fulfilledBy', 'name alias')
      .sort({ priority: -1, createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add fulfillment possibility check if requested
    if (canFulfill === 'true') {
      const fulfillableItems = [];
      for (const item of neededItems) {
        const fulfillmentCheck = await item.checkFulfillmentPossibility();
        if (fulfillmentCheck.canFulfill) {
          fulfillableItems.push({
            ...item.toObject(),
            fulfillmentCheck
          });
        }
      }
      neededItems = fulfillableItems;
    } else if (canFulfill === 'false') {
      const nonFulfillableItems = [];
      for (const item of neededItems) {
        const fulfillmentCheck = await item.checkFulfillmentPossibility();
        if (!fulfillmentCheck.canFulfill) {
          nonFulfillableItems.push({
            ...item.toObject(),
            fulfillmentCheck
          });
        }
      }
      neededItems = nonFulfillableItems;
    }

    const total = await NeededItem.countDocuments(filter);

    res.json({
      message: 'Needed items retrieved successfully',
      data: {
        neededItems,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get needed items error:', error);
    res.status(500).json({ message: 'Server error fetching needed items' });
  }
};

// Get fulfillable needed items
const getFulfillableItems = async (req, res) => {
  try {
    const fulfillableItems = await NeededItem.findFulfillableItems();

    res.json({
      message: 'Fulfillable items retrieved successfully',
      data: {
        fulfillableItems,
        count: fulfillableItems.length
      }
    });

  } catch (error) {
    console.error('Get fulfillable items error:', error);
    res.status(500).json({ message: 'Server error fetching fulfillable items' });
  }
};

// Fulfill needed items (manual fulfillment)
const fulfillNeededItems = async (req, res) => {
  try {
    const { itemIds, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs array is required' });
    }

    const results = [];
    const errors = [];

    for (const itemId of itemIds) {
      try {
        const neededItem = await NeededItem.findById(itemId)
          .populate('inventoryItemId')
          .populate('orderReference.orderId');

        if (!neededItem) {
          errors.push({ itemId, error: 'Needed item not found' });
          continue;
        }

        if (neededItem.status === 'fulfilled') {
          errors.push({ itemId, error: 'Item already fulfilled' });
          continue;
        }

        // Check if fulfillment is possible
        const fulfillmentCheck = await neededItem.checkFulfillmentPossibility();
        if (!fulfillmentCheck.canFulfill) {
          errors.push({ 
            itemId, 
            error: fulfillmentCheck.reason,
            availableQuantity: fulfillmentCheck.availableQuantity,
            neededQuantity: fulfillmentCheck.neededQuantity
          });
          continue;
        }

        const quantityToFulfill = neededItem.quantityNeeded - neededItem.quantityFulfilled;
        const inventoryItem = neededItem.inventoryItemId;

        // Reserve inventory
        let reservationSuccess = false;
        if (inventoryItem.type === 'finished_product') {
          reservationSuccess = inventoryItem.reserveQuantityForDimension(
            neededItem.dimensionId, 
            quantityToFulfill
          );
        } else {
          if (inventoryItem.availableQuantity >= quantityToFulfill) {
            inventoryItem.reservedQuantity += quantityToFulfill;
            inventoryItem.availableQuantity -= quantityToFulfill;
            reservationSuccess = true;
          }
        }

        if (!reservationSuccess) {
          errors.push({ itemId, error: 'Failed to reserve inventory' });
          continue;
        }

        // Update needed item
        neededItem.quantityFulfilled = neededItem.quantityNeeded;
        neededItem.fulfilledBy = req.user._id;
        neededItem.fulfilledAt = new Date();
        if (notes) {
          neededItem.notes = notes;
        }

        // Save both items
        await Promise.all([
          neededItem.save(),
          inventoryItem.save()
        ]);

        // Check if order can now be dispatched
        await checkOrderDispatchability(neededItem.orderReference.orderId);

        results.push({
          itemId,
          productName: neededItem.productName,
          quantityFulfilled: quantityToFulfill,
          status: 'fulfilled'
        });

      } catch (itemError) {
        console.error(`Error fulfilling item ${itemId}:`, itemError);
        errors.push({ itemId, error: 'Internal error fulfilling item' });
      }
    }

    res.json({
      message: 'Fulfillment process completed',
      data: {
        fulfilled: results,
        errors: errors,
        summary: {
          totalRequested: itemIds.length,
          fulfilled: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Fulfill needed items error:', error);
    res.status(500).json({ message: 'Server error fulfilling needed items' });
  }
};

// Check fulfillment status for specific items
const checkFulfillmentStatus = async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ message: 'Item IDs array is required' });
    }

    const statusChecks = [];

    for (const itemId of itemIds) {
      const neededItem = await NeededItem.findById(itemId)
        .populate('inventoryItemId', 'name type dimensions availableQuantity');

      if (!neededItem) {
        statusChecks.push({
          itemId,
          status: 'not_found',
          error: 'Needed item not found'
        });
        continue;
      }

      const fulfillmentCheck = await neededItem.checkFulfillmentPossibility();
      
      statusChecks.push({
        itemId,
        productName: neededItem.productName,
        dimensions: neededItem.dimensions,
        quantityNeeded: neededItem.quantityNeeded,
        quantityFulfilled: neededItem.quantityFulfilled,
        status: neededItem.status,
        canFulfill: fulfillmentCheck.canFulfill,
        availableQuantity: fulfillmentCheck.availableQuantity,
        reason: fulfillmentCheck.reason
      });
    }

    res.json({
      message: 'Fulfillment status checked',
      data: statusChecks
    });

  } catch (error) {
    console.error('Check fulfillment status error:', error);
    res.status(500).json({ message: 'Server error checking fulfillment status' });
  }
};

// Auto-detect and create needed items from orders
const autoDetectNeededItems = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('products.inventoryItemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const detectedItems = await NeededItem.detectNeededItemsFromOrder(order);
    
    if (detectedItems.length === 0) {
      return res.json({
        message: 'No needed items detected - all products are available',
        data: {
          neededItems: [],
          canDispatch: true
        }
      });
    }

    // Create needed items
    const createdItems = await NeededItem.insertMany(detectedItems);

    // Update order status
    order.canDispatch = false;
    order.isBlocked = true;
    order.blockedReason = `${detectedItems.length} items needed before dispatch`;
    order.blockedAt = new Date();
    order.blockedBy = req.user._id;
    
    await order.save();

    res.json({
      message: 'Needed items detected and created',
      data: {
        neededItems: createdItems,
        canDispatch: false,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          isBlocked: order.isBlocked,
          blockedReason: order.blockedReason
        }
      }
    });

  } catch (error) {
    console.error('Auto-detect needed items error:', error);
    res.status(500).json({ message: 'Server error detecting needed items' });
  }
};

// Helper function to check if order can be dispatched after fulfillment
const checkOrderDispatchability = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    // Check if all needed items for this order are fulfilled
    const pendingNeededItems = await NeededItem.find({
      'orderReference.orderId': orderId,
      status: { $in: ['pending', 'partially_fulfilled'] }
    });

    if (pendingNeededItems.length === 0) {
      // All needed items are fulfilled, order can be dispatched
      order.canDispatch = true;
      order.isBlocked = false;
      order.blockedReason = null;
      order.fulfilledAt = new Date();
      
      order.history.push({
        by: order.createdBy, // System action
        from: order.status,
        to: order.status,
        note: 'All needed items fulfilled - order ready for dispatch',
        at: new Date()
      });

      await order.save();
    }
  } catch (error) {
    console.error('Error checking order dispatchability:', error);
  }
};

// Delete needed item (admin only)
const deleteNeededItem = async (req, res) => {
  try {
    const { id } = req.params;

    const neededItem = await NeededItem.findById(id);
    if (!neededItem) {
      return res.status(404).json({ message: 'Needed item not found' });
    }

    if (neededItem.status === 'fulfilled') {
      return res.status(400).json({ message: 'Cannot delete fulfilled needed item' });
    }

    await NeededItem.findByIdAndDelete(id);

    res.json({
      message: 'Needed item deleted successfully'
    });

  } catch (error) {
    console.error('Delete needed item error:', error);
    res.status(500).json({ message: 'Server error deleting needed item' });
  }
};

module.exports = {
  getNeededItems,
  getFulfillableItems,
  fulfillNeededItems,
  checkFulfillmentStatus,
  autoDetectNeededItems,
  deleteNeededItem
};