const { Order, Inventory } = require('../models');
const { getNextSequence } = require('../utils/counter');
const { canTransition, getInitialState } = require('../utils/stateMachine');

// Create new order with robust inventory management
const createOrder = async (req, res) => {
  try {
    const { type, customerOrSupplier, vehicle, products } = req.body;
    console.log('Creating order:', req.body);

    // Generate order number
    const orderNumber = await getNextSequence('orders');

    // Get initial state based on order type
    const initialStatus = getInitialState(type);

    // Validate and process products
    const processedProducts = [];
    let isOrderBlocked = false;
    const blockedReasons = [];

    for (const product of products) {
      // Require inventoryItemId for all orders
      if (!product.inventoryItemId) {
        return res.status(400).json({ 
          message: 'All products must have a valid inventory item selected. Please select from existing inventory.' 
        });
      }

      const inventoryItem = await Inventory.findById(product.inventoryItemId);
      if (!inventoryItem) {
        return res.status(400).json({ 
          message: `Inventory item not found for product: ${product.name}` 
        });
      }

      // Validate item type matches order type
      const expectedType = type === 'dispatch' ? 'finished_product' : 'raw_material';
      if (inventoryItem.type !== expectedType) {
        return res.status(400).json({ 
          message: `Invalid item type. ${type} orders require ${expectedType} items.` 
        });
      }

      const processedProduct = {
        inventoryItemId: inventoryItem._id,
        name: inventoryItem.name, // Use name from inventory item
        dimensions: inventoryItem.dimensions,
        length: product.length || '',
        quantity: product.quantity,
        quantityFulfilled: 0,
        quantityPending: product.quantity,
        unit: inventoryItem.unit
      };

      if (type === 'dispatch') {
        // Check stock availability for dispatch orders
        if (inventoryItem.availableQuantity < product.quantity) {
          // Insufficient stock - partially fulfill or block
          if (inventoryItem.availableQuantity > 0) {
            // Partial fulfillment
            processedProduct.quantityFulfilled = inventoryItem.availableQuantity;
            processedProduct.quantityPending = product.quantity - inventoryItem.availableQuantity;
            
            // Reserve available quantity
            inventoryItem.reserveQuantity(inventoryItem.availableQuantity);
            inventoryItem.lastUpdatedBy = req.user._id;
            await inventoryItem.save();
            
            isOrderBlocked = true;
            blockedReasons.push(`${product.name} - Partial stock (${inventoryItem.availableQuantity}/${product.quantity})`);
          } else {
            // No stock available - full block
            isOrderBlocked = true;
            blockedReasons.push(`${product.name} - Out of stock`);
          }
          

          
        } else {
          // Sufficient stock available
          processedProduct.quantityFulfilled = product.quantity;
          processedProduct.quantityPending = 0;
          
          // Reserve inventory
          inventoryItem.reserveQuantity(product.quantity);
          inventoryItem.lastUpdatedBy = req.user._id;
          await inventoryItem.save();
        }
      } else if (type === 'purchase') {
        // For purchase orders, we're adding inventory
        processedProduct.quantityFulfilled = product.quantity;
        processedProduct.quantityPending = 0;
      }

      processedProducts.push(processedProduct);
    }

    // Create order
    const order = new Order({
      orderNumber,
      type,
      status: initialStatus,
      customerOrSupplier,
      vehicle,
      products: processedProducts,
      createdBy: req.user._id,
      isBlocked: isOrderBlocked,
      blockedReason: isOrderBlocked ? blockedReasons.join('; ') : null,
      blockedAt: isOrderBlocked ? new Date() : null,
      blockedBy: isOrderBlocked ? req.user._id : null,
      history: [{
        by: req.user._id,
        from: null,
        to: initialStatus,
        note: isOrderBlocked ? `Order created (BLOCKED: ${blockedReasons.join('; ')})` : 'Order created',
        at: new Date()
      }]
    });

    await order.save();

    // Add blocked orders to inventory items
    if (isOrderBlocked && type === 'dispatch') {
      for (const product of processedProducts) {
        if (product.inventoryItemId && product.quantityPending > 0) {
          const inventoryItem = await Inventory.findById(product.inventoryItemId);
          if (inventoryItem) {
            inventoryItem.blockedOrders.push({
              orderId: order._id,
              quantityNeeded: product.quantityPending,
              dateBlocked: new Date()
            });
            await inventoryItem.save();
          }
        }
      }
    }

    // Populate created order for response
    await order.populate('createdBy', 'name alias');
    await order.populate('products.inventoryItemId', 'name sku availableQuantity');

    res.status(201).json({
      message: isOrderBlocked ? 'Order created but blocked due to insufficient inventory' : 'Order created successfully',
      order,
      blocked: isOrderBlocked,
      blockedReasons: isOrderBlocked ? blockedReasons : null
    });

  } catch (error) {
    console.error('Create order error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error creating order' });
  }
};





// Helper function to try fulfilling blocked orders after purchase
const tryFulfillBlockedOrdersAfterPurchase = async (purchasedProducts, userId) => {
  try {
    for (const product of purchasedProducts) {
      if (product.inventoryItemId) {
        const inventoryItem = await Inventory.findById(product.inventoryItemId);
        if (inventoryItem && inventoryItem.blockedOrders.length > 0) {
          
          // Try to fulfill blocked orders
          for (const blockedOrder of inventoryItem.blockedOrders) {
            const order = await Order.findById(blockedOrder.orderId);
            if (order && order.isBlocked) {
              
              // Check if we can fulfill this blocked order
              const neededQuantity = blockedOrder.quantityNeeded;
              if (inventoryItem.availableQuantity >= neededQuantity) {
                
                // Reserve the inventory
                inventoryItem.reserveQuantity(neededQuantity);
                
                // Update the order product fulfillment
                const orderProduct = order.products.find(p => 
                  p.inventoryItemId && p.inventoryItemId.toString() === inventoryItem._id.toString()
                );
                
                if (orderProduct) {
                  orderProduct.quantityFulfilled += neededQuantity;
                  orderProduct.quantityPending -= neededQuantity;
                  
                  // Check if order is fully fulfilled
                  const isFullyFulfilled = order.products.every(p => p.quantityPending === 0);
                  
                  if (isFullyFulfilled) {
                    order.isBlocked = false;
                    order.blockedReason = null;
                    order.fulfilledAt = new Date();
                    
                    order.history.push({
                      by: userId,
                      from: order.status,
                      to: order.status,
                      note: 'Order unblocked - inventory fulfilled by purchase',
                      at: new Date()
                    });
                  }
                  
    await order.save();
                }
                
                // Remove from blocked orders
                inventoryItem.blockedOrders = inventoryItem.blockedOrders.filter(
                  b => b.orderId.toString() !== blockedOrder.orderId.toString()
                );
              }
            }
          }
          
          inventoryItem.lastUpdatedBy = userId;
          await inventoryItem.save();
        }
      }
    }
  } catch (error) {
    console.error('Error trying to fulfill blocked orders after purchase:', error);
  }
};

// Get orders by status
const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    
    let filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'name alias')
      .populate('products.inventoryItemId', 'name sku availableQuantity status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get orders by status error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

// Get blocked orders
const getBlockedOrders = async (req, res) => {
  try {
    const blockedOrders = await Order.findBlockedOrders()
      .populate('products.inventoryItemId', 'name sku availableQuantity status');

    res.json({
      message: 'Blocked orders retrieved',
      orders: blockedOrders
    });

  } catch (error) {
    console.error('Get blocked orders error:', error);
    res.status(500).json({ message: 'Server error fetching blocked orders' });
  }
};

// Try to fulfill blocked order
const tryFulfillBlockedOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('products.inventoryItemId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.isBlocked) {
      return res.status(400).json({ message: 'Order is not blocked' });
    }

    let canFulfill = true;
    const fulfillmentResults = [];

    // Check each product
    for (const product of order.products) {
      if (product.quantityPending > 0) {
        const inventoryItem = await Inventory.findById(product.inventoryItemId);
        
        if (!inventoryItem || inventoryItem.availableQuantity < product.quantityPending) {
          canFulfill = false;
          fulfillmentResults.push({
            product: product.name,
            needed: product.quantityPending,
            available: inventoryItem ? inventoryItem.availableQuantity : 0
          });
        }
      }
    }

    if (!canFulfill) {
      return res.status(400).json({ 
        message: 'Cannot fulfill order - insufficient inventory',
        details: fulfillmentResults
      });
    }

    // Fulfill the order
    for (const product of order.products) {
      if (product.quantityPending > 0) {
        const inventoryItem = await Inventory.findById(product.inventoryItemId);
        
        // Reserve the inventory
        inventoryItem.reserveQuantity(product.quantityPending);
        inventoryItem.lastUpdatedBy = req.user._id;
        
        // Remove from blocked orders
        inventoryItem.blockedOrders = inventoryItem.blockedOrders.filter(
          b => b.orderId.toString() !== orderId
        );
        
        await inventoryItem.save();
        
        // Update product fulfillment
        product.quantityFulfilled += product.quantityPending;
        product.quantityPending = 0;
      }
    }

    // Update order status
    order.isBlocked = false;
    order.blockedReason = null;
  order.blockedAt = null;
  order.blockedBy = null;
    order.fulfilledAt = new Date();
    
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: 'Order unblocked - inventory fulfilled',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Order fulfilled successfully',
      order
    });

  } catch (error) {
    console.error('Fulfill blocked order error:', error);
    res.status(500).json({ message: 'Server error fulfilling order' });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const { 
      status, 
      type, 
      blocked, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // if (status && status !== 'all') {
    //   const statusArray = status.split(',').map(s => s.trim()); // Split and trim statuses
    //   filter.status = { $in: statusArray }; // Use $in to match any status in the array
    // }

    if (status && status !== 'all') {
      // Split statuses and validate
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s.length > 0);
      console.log('Parsed statuses:', statusArray); // Debug: Log parsed statuses
      
      if (statusArray.length === 0) {
        return res.status(400).json({ message: 'Invalid status parameter: Empty or malformed status list' });
      }

      // Optional: Validate statuses against allowed values (from state machine)
      const validStatuses = [
        'pending_guard_approval',
        'inside_factory_pending_empty_weight',
        'inside_factory_pending_empty_weight_purchase',
        'inside_factory_pending_loading',
        'inside_factory_pending_unloading',
        'inside_factory_pending_final_weight',
        'inside_factory_pending_final_weight_purchase',
        'ready_for_billing',
        'ready_for_billing_purchase',
        'ready_for_dispatch',
        'ready_for_exit_purchase',
        'completed'
      ];
      
      const invalidStatuses = statusArray.filter(s => !validStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        return res.status(400).json({ 
          message: `Invalid status values: ${invalidStatuses.join(', ')}`,
          validStatuses 
        });
      }

      filter.status = { $in: statusArray }; // Use $in to match any status in the array
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (blocked === 'true') {
      filter.isBlocked = true;
    } else if (blocked === 'false') {
      filter.isBlocked = false;
    }
    
    if (search) {
      filter.$or = [
        { customerOrSupplier: { $regex: search, $options: 'i' } },
        { 'vehicle.number': { $regex: search, $options: 'i' } },
        { orderNumber: parseInt(search) || 0 }
      ];
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'name alias')
      .populate('products.inventoryItemId', 'name sku availableQuantity status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('createdBy', 'name alias role')
      .populate('products.inventoryItemId', 'name sku dimensions availableQuantity status')
      .populate('history.by', 'name alias')
      .populate('blockedBy', 'name alias');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error fetching order' });
  }
};

// Update order status (existing functionality)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if transition is valid
    if (!canTransition(order.status, status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${order.status} to ${status}` 
      });
    }

    const oldStatus = order.status;
    order.status = status;

    // Add to history
    order.history.push({
      by: req.user._id,
      from: oldStatus,
      to: status,
      note: note || `Status updated to ${status}`,
      at: new Date()
    });

    await order.save();

    // Populate for response
    await order.populate('createdBy', 'name alias');
    await order.populate('history.by', 'name alias');

    res.json({
      message: 'Order status updated',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
};

// Guard approve order
const guardApprove = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status to next appropriate status
    const newStatus = order.type === 'dispatch' 
      ? 'inside_factory_pending_empty_weight'
      : 'inside_factory_pending_empty_weight_purchase';

    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: 'pending_guard_approval',
      to: newStatus,
      note: 'Guard approved entry',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Order approved by guard',
      order
    });

  } catch (error) {
    console.error('Guard approve error:', error);
    res.status(500).json({ message: 'Server error approving order' });
  }
};

// Record empty weight
const recordEmptyWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { emptyWeight, slipUrl } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update weights
    order.weights = {
      ...order.weights,
      emptyWeight,
      slipUrl
    };

    // Update status to next appropriate status
    const newStatus = order.type === 'dispatch' 
      ? 'inside_factory_pending_loading'
      : 'inside_factory_pending_unloading';

    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: newStatus,
      note: `Empty weight recorded: ${emptyWeight}kg`,
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Empty weight recorded',
      order
    });

  } catch (error) {
    console.error('Record empty weight error:', error);
    res.status(500).json({ message: 'Server error recording empty weight' });
  }
};

// Ready for loading
const readyForLoading = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: 'Ready for loading signalled',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Ready for loading signalled',
      order
    });

  } catch (error) {
    console.error('Ready for loading error:', error);
    res.status(500).json({ message: 'Server error signalling ready for loading' });
  }
};

// Ready for unloading
const readyForUnloading = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: 'Ready for unloading signalled',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Ready for unloading signalled',
      order
    });

  } catch (error) {
    console.error('Ready for unloading error:', error);
    res.status(500).json({ message: 'Server error signalling ready for unloading' });
  }
};

// Accept loading
const acceptLoading = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: 'Loading accepted by supervisor',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Loading accepted',
      order
    });

  } catch (error) {
    console.error('Accept loading error:', error);
    res.status(500).json({ message: 'Server error accepting loading' });
  }
};

// Accept unloading
const acceptUnloading = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
      note: 'Unloading accepted by supervisor',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Unloading accepted',
      order
    });

  } catch (error) {
    console.error('Accept unloading error:', error);
    res.status(500).json({ message: 'Server error accepting unloading' });
  }
};

// Loading complete
const loadingComplete = async (req, res) => {
  try {
    const { id } = req.params;
  const { bundles, weightPerBundle, totalLoadedWeight, productLoads, notes } = req.body;

    const order = await Order.findById(id)
      .populate('products.inventoryItemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.type !== 'dispatch') {
      return res.status(400).json({ message: 'Loading completion is only applicable to dispatch orders' });
    }

    if (order.status !== 'inside_factory_pending_loading') {
      return res.status(400).json({ message: 'Order is not ready for loading completion' });
    }

    if (!Array.isArray(productLoads) || productLoads.length === 0) {
      return res.status(400).json({ message: 'At least one product load entry is required' });
    }

    const loadAggregation = new Map();
    const normalizedLoads = [];
    let bundlesFromLoads = 0;
    let weightFromLoads = 0;

    for (const load of productLoads) {
      const productIndex = Number(load.productIndex);

      if (
        Number.isNaN(productIndex) ||
        productIndex < 0 ||
        productIndex >= order.products.length
      ) {
        return res.status(400).json({ message: 'Invalid product load data provided' });
      }

      const bundleDetailsInput = Array.isArray(load.bundleDetails) ? load.bundleDetails : [];
      if (bundleDetailsInput.length === 0) {
        return res.status(400).json({ message: 'Each product must include at least one bundle entry' });
      }

      const sanitizedBundleDetails = [];
      let totalWeightForLoad = 0;

      for (let detailIdx = 0; detailIdx < bundleDetailsInput.length; detailIdx++) {
        const detail = bundleDetailsInput[detailIdx];
        const weightValue = Number(detail.weight);
        if (Number.isNaN(weightValue) || weightValue <= 0) {
          return res.status(400).json({ message: 'Each bundle must have a positive weight value' });
        }

        let lengthValue;
        if (detail.length !== undefined && detail.length !== null && detail.length !== '') {
          lengthValue = Number(detail.length);
          if (Number.isNaN(lengthValue) || lengthValue < 0) {
            return res.status(400).json({ message: 'Bundle length must be a positive number' });
          }
        }

        const sanitizedDetail = {
          bundleNumber: detail.bundleNumber ? Number(detail.bundleNumber) : detailIdx + 1,
          weight: Number(weightValue.toFixed(3))
        };

        const sizeValue = typeof detail.size === 'string' ? detail.size.trim() : '';
        if (sizeValue) {
          sanitizedDetail.size = sizeValue;
        }

        if (lengthValue !== undefined) {
          sanitizedDetail.length = Number(lengthValue.toFixed(3));
        }

        sanitizedBundleDetails.push(sanitizedDetail);
        totalWeightForLoad += weightValue;
      }

      const bundleCount = sanitizedBundleDetails.length;

      normalizedLoads.push({
        productIndex,
        bundles: bundleCount,
        totalWeight: Number(totalWeightForLoad.toFixed(3)),
        bundleDetails: sanitizedBundleDetails
      });

      const aggregated = loadAggregation.get(productIndex) || { bundles: 0, weight: 0 };
      aggregated.bundles += bundleCount;
      aggregated.weight += totalWeightForLoad;
      loadAggregation.set(productIndex, aggregated);

      bundlesFromLoads += bundleCount;
      weightFromLoads += totalWeightForLoad;
    }

    if (loadAggregation.size !== order.products.length) {
      return res.status(400).json({ message: 'Please provide loading details for every product in the order' });
    }

    const providedBundles = Number(bundles) || 0;
    if (providedBundles && bundlesFromLoads && providedBundles !== bundlesFromLoads) {
      return res.status(400).json({ message: 'Total bundles do not match the sum of product bundles' });
    }

    const bundlesTotal = bundlesFromLoads || providedBundles;
    if (bundlesTotal <= 0) {
      return res.status(400).json({ message: 'Total bundles must be greater than zero' });
    }

  const providedTotalWeight = Number(totalLoadedWeight) || 0;
  const fallbackWeight = bundlesTotal * (Number(weightPerBundle) || 0);
  const derivedWeightTotal = weightFromLoads || providedTotalWeight || fallbackWeight;

    const inventoryUpdates = [];

    for (const [index, aggregated] of loadAggregation.entries()) {
      const orderProduct = order.products[index];
      if (!orderProduct || !orderProduct.inventoryItemId) {
        return res.status(400).json({ message: `Missing inventory reference for product at position ${index + 1}` });
      }

      if (aggregated.bundles !== orderProduct.quantity) {
        return res.status(400).json({
          message: `Loaded bundles for ${orderProduct.name} (${aggregated.bundles}) do not match ordered quantity (${orderProduct.quantity}).`
        });
      }

  const inventoryItemId = orderProduct.inventoryItemId._id || orderProduct.inventoryItemId;
      const inventoryItem = await Inventory.findById(inventoryItemId);
      if (!inventoryItem) {
        return res.status(400).json({ message: `Inventory item not found for product: ${orderProduct.name}` });
      }

      if (!inventoryItem.consumeInventory(aggregated.bundles)) {
        return res.status(400).json({
          message: `Unable to consume inventory for ${orderProduct.name}. Available: ${inventoryItem.quantity}`
        });
      }

      inventoryItem.lastUpdatedBy = req.user._id;
      inventoryItem.blockedOrders = (inventoryItem.blockedOrders || []).filter(
        blocked => blocked.orderId && blocked.orderId.toString() !== order._id.toString()
      );

      inventoryUpdates.push(inventoryItem.save());

      orderProduct.quantityFulfilled = aggregated.bundles;
      orderProduct.quantityPending = 0;
    }

    await Promise.all(inventoryUpdates);

    const averageWeightPerBundle = bundlesTotal > 0
      ? Number((derivedWeightTotal / bundlesTotal).toFixed(3))
      : 0;

    order.loadingDetails = {
      acceptedBy: req.user._id,
      bundles: bundlesTotal,
      totalLoadedWeight: Number(derivedWeightTotal.toFixed(3)),
      averageWeightPerBundle,
      productLoads: normalizedLoads
    };

    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (trimmedNotes) {
      order.loadingDetails.notes = trimmedNotes;
    }

    order.isBlocked = false;
    order.blockedReason = null;

    const previousStatus = order.status;
    order.status = 'inside_factory_pending_final_weight';
    order.history.push({
      by: req.user._id,
      from: previousStatus,
      to: order.status,
      note: `Loading completed. ${bundlesTotal} bundles${derivedWeightTotal ? `, ${derivedWeightTotal.toFixed(3)}kg total` : ''}`,
      at: new Date()
    });

    order.markModified('products');

    await order.save();
    await order.populate('products.inventoryItemId', 'name sku availableQuantity reservedQuantity status');

    res.json({
      message: 'Loading completed',
      order
    });

  } catch (error) {
    console.error('Loading complete error:', error);
    res.status(500).json({ message: 'Server error completing loading' });
  }
};

// Unloading complete
const unloadingComplete = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('products.inventoryItemId');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // For purchase orders, update inventory when unloading is complete
    if (order.type === 'purchase') {
      for (const product of order.products) {
        if (!product.inventoryItemId) {
          return res.status(400).json({
            message: `No inventory item ID found for product: ${product.name}. Cannot update inventory.`
          });
        }

        // Update existing inventory item only
        const inventoryItem = await Inventory.findById(product.inventoryItemId);
        if (!inventoryItem) {
      return res.status(400).json({ 
            message: `Inventory item not found for product: ${product.name}. Cannot update inventory.`
          });
        }

        inventoryItem.quantity += product.quantity;
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      }
      
      // Try to fulfill any blocked orders with the new inventory
      await tryFulfillBlockedOrdersAfterPurchase(order.products, req.user._id);
    }

    // Update status
    order.status = 'inside_factory_pending_final_weight_purchase';
    order.history.push({
      by: req.user._id,
      from: 'inside_factory_pending_unloading',
      to: 'inside_factory_pending_final_weight_purchase',
      note: 'Unloading completed - inventory updated',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Unloading completed and inventory updated',
      order
    });

  } catch (error) {
    console.error('Unloading complete error:', error);
    res.status(500).json({ message: 'Server error completing unloading' });
  }
};

// Record final weight
const recordFinalWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalWeight, slipUrl } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const expectedStatus = order.type === 'dispatch'
      ? 'inside_factory_pending_final_weight'
      : 'inside_factory_pending_final_weight_purchase';

    if (order.status !== expectedStatus) {
      return res.status(400).json({ message: 'Order is not ready for final weight recording' });
    }

    if (order.type === 'dispatch' && (!order.loadingDetails || !order.loadingDetails.bundles)) {
      return res.status(400).json({ message: 'Loading details must be recorded before capturing final weight' });
    }

    // Update weights and calculate net weight
    order.weights = {
      ...order.weights,
      finalWeight,
      slipUrl
    };

    if (order.weights.emptyWeight && finalWeight) {
      order.netWeight = Math.abs(finalWeight - order.weights.emptyWeight);
    }

    // Update status
    const newStatus = order.type === 'dispatch' 
      ? 'ready_for_billing'
      : 'ready_for_billing_purchase';
    const previousStatus = order.status;
    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: previousStatus,
      to: newStatus,
      note: `Final weight recorded: ${finalWeight}kg${order.netWeight ? `, Net: ${order.netWeight}kg` : ''}`,
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Final weight recorded',
      order
    });

  } catch (error) {
    console.error('Record final weight error:', error);
    res.status(500).json({ message: 'Server error recording final weight' });
  }
};

// Generate invoice
const generateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, RatePerUnit, TaxPercentage, invoiceNotes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const expectedStatus = order.type === 'dispatch'
      ? 'ready_for_billing'
      : 'ready_for_billing_purchase';

    if (order.status !== expectedStatus) {
      return res.status(400).json({ message: 'Order is not ready for invoicing' });
    }

    if (order.invoice && order.invoice.billNumber) {
      return res.status(400).json({ message: 'Invoice has already been generated for this order' });
    }

    // Generate bill number
    const billNumber = Math.floor(Math.random() * 1000000);

    // Update invoice
    const invoicePayload = {
      billNumber,
      amount
    };

    if (typeof RatePerUnit === 'number' && !Number.isNaN(RatePerUnit)) {
      invoicePayload.RatePerUnit = RatePerUnit;
    }

    if (typeof TaxPercentage === 'number' && !Number.isNaN(TaxPercentage)) {
      invoicePayload.TaxPercentage = TaxPercentage;
    }

    const trimmedInvoiceNotes = typeof invoiceNotes === 'string' ? invoiceNotes.trim() : '';
    if (trimmedInvoiceNotes) {
      invoicePayload.invoiceNotes = trimmedInvoiceNotes;
    }

    order.invoice = invoicePayload;

    // Update status
    const newStatus = order.type === 'dispatch' 
      ? 'ready_for_dispatch'
      : 'ready_for_exit_purchase';
    const previousStatus = order.status;
    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: previousStatus,
      to: newStatus,
      note: `Invoice generated: Bill #${billNumber}, Amount: ₹${amount}`,
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Invoice generated',
      order
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Server error generating invoice' });
  }
};

// Exit order
const exitOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const expectedStatus = order.type === 'dispatch'
      ? 'ready_for_dispatch'
      : 'ready_for_exit_purchase';

    if (order.status !== expectedStatus) {
      return res.status(400).json({ message: 'Order is not ready for exit' });
    }

    if (order.type === 'dispatch' && (!order.invoice || !order.invoice.billNumber)) {
      return res.status(400).json({ message: 'Invoice must be generated before marking dispatch exit' });
    }

    // Update status to completed
    const previousStatus = order.status;
    order.status = 'completed';
    order.history.push({
      by: req.user._id,
      from: previousStatus,
      to: 'completed',
      note: 'Vehicle exited factory',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Order completed - vehicle exited',
      order
    });

  } catch (error) {
    console.error('Exit order error:', error);
    res.status(500).json({ message: 'Server error completing order exit' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrdersByStatus,
  getBlockedOrders,
  tryFulfillBlockedOrder,
  getOrderById,
  updateOrderStatus,
  guardApprove,
  recordEmptyWeight,
  readyForLoading,
  readyForUnloading,
  acceptLoading,
   acceptUnloading,
  loadingComplete,
  unloadingComplete,
  recordFinalWeight,
  generateInvoice,
  exitOrder
};