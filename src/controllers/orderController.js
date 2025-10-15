const { Order, Inventory, NeededItem } = require('../models');
const { getNextSequence } = require('../utils/counter');
const { canTransition, getInitialState } = require('../utils/stateMachine');

// Function to update order availability when inventory changes
const updateOrdersAvailabilityAfterInventoryChange = async (inventoryItemId, dimensionId = null, userId) => {
  try {
    console.log(`Updating order availability after inventory change for item: ${inventoryItemId}, dimension: ${dimensionId}`);
    
    // Find all draft dispatch orders that use this inventory item
    let filter = {
      type: 'dispatch',
      status: 'draft',
      'products.inventoryItemId': inventoryItemId
    };
    
    if (dimensionId) {
      filter['products.dimensionId'] = dimensionId;
    }
    
    const affectedOrders = await Order.find(filter).populate('products.inventoryItemId');
    
    console.log(`Found ${affectedOrders.length} orders to check for availability updates`);
    
    for (const order of affectedOrders) {
      const { canDispatch, availabilityResults, neededItems } = await checkOrderAvailability(order);
      
      // Update order if availability status changed
      if (order.canDispatch !== canDispatch) {
        order.canDispatch = canDispatch;
        
        order.history.push({
          by: userId,
          from: order.status,
          to: order.status,
          note: canDispatch 
            ? 'Order availability updated - now ready for dispatch' 
            : 'Order availability updated - items needed',
          at: new Date()
        });
        
        await order.save();
        console.log(`Updated order ${order.orderNumber} availability: ${canDispatch}`);
      }
      
      // Update needed items
      await updateNeededItemsForOrder(order._id, neededItems, userId);
    }
    
  } catch (error) {
    console.error('Error updating order availability after inventory change:', error);
  }
};

// Function to update needed items for an order
const updateNeededItemsForOrder = async (orderId, newNeededItems, userId) => {
  try {
    // Remove existing needed items for this order
    await NeededItem.deleteMany({
      'orderReference.orderId': orderId,
      status: { $in: ['pending', 'partially_fulfilled'] }
    });
    
    // Create new needed items if any
    if (newNeededItems && newNeededItems.length > 0) {
      const order = await Order.findById(orderId);
      const neededItemRecords = newNeededItems.map(item => ({
        productName: item.productName,
        dimensions: item.dimensions,
        quantityNeeded: item.quantityNeeded,
        bundlesNeeded: Math.ceil(item.quantityNeeded / 1),
        inventoryItemId: item.inventoryItemId,
        dimensionId: item.dimensionId,
        orderReference: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerOrSupplier: order.customerOrSupplier
        },
        priority: order.priority || 'medium',
        createdBy: userId
      }));
      
      await NeededItem.insertMany(neededItemRecords);
      console.log(`Created ${neededItemRecords.length} needed items for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('Error updating needed items for order:', error);
  }
};

// Debug endpoint to test order validation without creating
const debugOrderValidation = async (req, res) => {
  try {
    const { type, customerOrSupplier, vehicle, products } = req.body;
    console.log('Debug order validation:', JSON.stringify(req.body, null, 2));

    const validationResults = {
      type: type,
      customerOrSupplier: customerOrSupplier,
      productsCount: products ? products.length : 0,
      products: []
    };

    if (products && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productValidation = {
          index: i,
          inventoryItemId: product.inventoryItemId || 'MISSING',
          dimensionId: product.dimensionId || 'MISSING',
          quantity: product.quantity || 0,
          name: product.name || 'MISSING',
          errors: []
        };

        // Same validation as createOrder
        if (!product.inventoryItemId) {
          productValidation.errors.push('inventoryItemId is required');
        }

        if (!product.quantity || product.quantity <= 0) {
          productValidation.errors.push('quantity must be greater than 0');
        }

        // Check if inventory item exists
        if (product.inventoryItemId) {
          try {
            const inventoryItem = await Inventory.findById(product.inventoryItemId);
            if (!inventoryItem) {
              productValidation.errors.push('inventory item not found in database');
            } else {
              productValidation.inventoryItemExists = true;
              productValidation.inventoryItemType = inventoryItem.type;
              
              if (inventoryItem.type === 'finished_product' && type === 'dispatch') {
                if (!product.dimensionId) {
                  productValidation.errors.push('dimensionId is required for finished products');
                } else {
                  const dimension = inventoryItem.dimensions.id(product.dimensionId);
                  if (!dimension) {
                    productValidation.errors.push('dimension not found in inventory item');
                    productValidation.availableDimensions = inventoryItem.dimensions.map(d => ({
                      id: d._id,
                      dimension: d.dimension
                    }));
                  } else {
                    productValidation.dimensionExists = true;
                    productValidation.dimensionInfo = {
                      dimension: dimension.dimension,
                      availableQuantity: dimension.availableQuantity
                    };
                  }
                }
              }
            }
          } catch (error) {
            productValidation.errors.push(`error checking inventory: ${error.message}`);
          }
        }

        validationResults.products.push(productValidation);
      }
    }

    res.json({
      message: 'Order validation debug results',
      validation: validationResults
    });

  } catch (error) {
    console.error('Debug order validation error:', error);
    res.status(500).json({ 
      message: 'Debug validation error', 
      error: error.message 
    });
  }
};

// Create new order with new workflow
const createOrder = async (req, res) => {
  try {
    console.log('=== CREATE ORDER REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { type, customerOrSupplier, vehicle, products } = req.body;
    
    console.log('Destructured values:');
    console.log('- type:', type);
    console.log('- customerOrSupplier:', customerOrSupplier);
    console.log('- vehicle:', vehicle);
    console.log('- products:', products);
    console.log('- products type:', typeof products);
    console.log('- products is array:', Array.isArray(products));

    // Generate order number
    const orderNumber = await getNextSequence('orders');

    // Validate products array
    if (!products || !Array.isArray(products)) {
      console.log('❌ Products is not an array:', products);
      return res.status(400).json({ 
        message: 'Products must be an array',
        receivedProducts: products,
        typeOfProducts: typeof products
      });
    }
    
    if (products.length === 0) {
      console.log('❌ Products array is empty');
      return res.status(400).json({ 
        message: 'At least one product is required',
        receivedProducts: products
      });
    }

    // Validate and process products
    const processedProducts = [];
    const neededItems = [];
    let canDispatch = true;

    console.log(`Processing ${products.length} products...`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Product ${i + 1}:`, JSON.stringify(product, null, 2));
      
      // Require inventoryItemId for all orders
      if (!product.inventoryItemId) {
        console.log(`❌ Product ${i + 1} missing inventoryItemId:`, product);
        return res.status(400).json({ 
          message: `Product ${i + 1} is missing inventoryItemId. Please select from existing inventory.`,
          product: product,
          receivedFields: Object.keys(product)
        });
      }
      
      console.log(`✅ Product ${i + 1} has inventoryItemId: ${product.inventoryItemId}`);

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
        dimensionId: product.dimensionId || null,
        name: inventoryItem.name,
        dimensions: product.dimensions || '',
        quantity: product.quantity,
        quantityFulfilled: 0,
        quantityPending: product.quantity,
        unit: inventoryItem.unit
      };

      if (type === 'dispatch') {
        // Enhanced stock availability check for dispatch orders
        let availableQuantity = 0;
        let dimensionInfo = null;
        
        if (inventoryItem.type === 'finished_product' && inventoryItem.dimensions && inventoryItem.dimensions.length > 0) {
          console.log(`Processing finished product: ${inventoryItem.name}`);
          console.log(`Product dimensionId: "${product.dimensionId}" (type: ${typeof product.dimensionId})`);
          console.log(`Available dimensions:`, inventoryItem.dimensions.map(d => ({ id: d._id.toString(), dimension: d.dimension })));
          
          if (product.dimensionId && 
              product.dimensionId !== null && 
              product.dimensionId !== undefined && 
              product.dimensionId.toString().trim() !== '' && 
              product.dimensionId.toString() !== 'null' && 
              product.dimensionId.toString() !== 'undefined') {
            // For finished products with specific dimension
            let dimension = inventoryItem.dimensions.id(product.dimensionId);
            
            // If not found with .id(), try manual search (in case of string/ObjectId mismatch)
            if (!dimension) {
              dimension = inventoryItem.dimensions.find(d => 
                d._id.toString() === product.dimensionId.toString()
              );
            }
            
            console.log(`Found dimension:`, dimension ? { id: dimension._id, name: dimension.dimension } : 'NOT FOUND');
            
            if (dimension) {
              availableQuantity = dimension.availableQuantity || 0;
              dimensionInfo = {
                dimension: dimension.dimension,
                sku: dimension.sku,
                totalQuantity: dimension.quantity,
                reservedQuantity: dimension.reservedQuantity,
                availableQuantity: dimension.availableQuantity
              };
            } else {
              return res.status(400).json({ 
                message: `Selected dimension not found for product: ${inventoryItem.name}. Available dimensions: ${inventoryItem.dimensions.map(d => d.dimension).join(', ')}` 
              });
            }
          } else {
            console.log(`No dimensionId provided for finished product: ${inventoryItem.name}`);
          console.log(`Product object:`, JSON.stringify(product, null, 2));
            return res.status(400).json({ 
              message: `Dimension must be selected for finished product: ${inventoryItem.name}. Available dimensions: ${inventoryItem.dimensions.map(d => d.dimension).join(', ')}`,
              availableDimensions: inventoryItem.dimensions.map(d => ({ id: d._id, dimension: d.dimension })),
              receivedDimensionId: product.dimensionId
            });
          }
        } else {
          // For raw materials and simple inventory
          availableQuantity = inventoryItem.availableQuantity || 0;
        }
        
        console.log(`Checking availability for ${inventoryItem.name}: ${availableQuantity}/${product.quantity}`);
        
        if (availableQuantity < product.quantity) {
          canDispatch = false;
          const shortfall = product.quantity - availableQuantity;
          
          neededItems.push({
            productName: inventoryItem.name,
            dimensions: product.dimensions || (dimensionInfo ? dimensionInfo.dimension : ''),
            quantityNeeded: shortfall,
            availableQuantity: availableQuantity,
            requestedQuantity: product.quantity,
            inventoryItemId: inventoryItem._id,
            dimensionId: product.dimensionId,
            dimensionInfo: dimensionInfo
          });
          
          console.log(`Shortfall detected: ${shortfall} units needed for ${inventoryItem.name}`);
        }
        
        // Store availability info in the product for later reference
        processedProduct.availabilityInfo = {
          availableQuantity,
          requestedQuantity: product.quantity,
          isAvailable: availableQuantity >= product.quantity,
          shortfall: availableQuantity < product.quantity ? product.quantity - availableQuantity : 0,
          dimensionInfo
        };
      }

      processedProducts.push(processedProduct);
    }

    // Determine initial status based on order type and workflow
    let initialStatus;
    if (type === 'dispatch') {
      initialStatus = 'draft'; // Start as draft, will move to pending_dispatch_approval when dispatch button clicked
    } else {
      // Purchase orders need vehicle info from the start
      if (!vehicle || !vehicle.number || !vehicle.driverName || !vehicle.driverNumber) {
        return res.status(400).json({ 
          message: 'Vehicle information is required for purchase orders.' 
        });
      }
      initialStatus = 'pending_guard_approval';
    }

    // Create order
    const order = new Order({
      orderNumber,
      type,
      status: initialStatus,
      customerOrSupplier,
      vehicle: type === 'purchase' ? vehicle : undefined, // Only set vehicle for purchase orders initially
      products: processedProducts,
      neededItems,
      canDispatch,
      createdBy: req.user._id,
      history: [{
        by: req.user._id,
        from: null,
        to: initialStatus,
        note: type === 'dispatch' 
          ? (canDispatch ? 'Order created - ready for dispatch' : 'Order created - items needed before dispatch')
          : 'Purchase order created',
        at: new Date()
      }]
    });

    await order.save();

    // Create NeededItem records for any shortfalls
    if (neededItems.length > 0) {
      const neededItemRecords = neededItems.map(item => ({
        productName: item.productName,
        dimensions: item.dimensions,
        quantityNeeded: item.quantityNeeded,
        bundlesNeeded: Math.ceil(item.quantityNeeded / 1), // Assuming 1 unit per bundle for now
        inventoryItemId: item.inventoryItemId,
        dimensionId: item.dimensionId,
        orderReference: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerOrSupplier: order.customerOrSupplier
        },
        priority: 'medium',
        createdBy: req.user._id
      }));

      await NeededItem.insertMany(neededItemRecords);
    }

    // Populate created order for response
    await order.populate('createdBy', 'name alias');
    await order.populate('products.inventoryItemId', 'name sku availableQuantity');

    res.status(201).json({
      message: 'Order created successfully',
      order,
      canDispatch,
      neededItems: neededItems.length > 0 ? neededItems : null
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

    // Add needed items information to each order
    const ordersWithNeededItems = await Promise.all(
      orders.map(async (order) => {
        const neededItems = await NeededItem.find({
          'orderReference.orderId': order._id,
          status: { $in: ['pending', 'partially_fulfilled'] }
        });

        return {
          ...order.toObject(),
          neededItems: neededItems.map(item => ({
            productName: item.productName,
            dimensions: item.dimensions,
            quantityNeeded: item.quantityNeeded - item.quantityFulfilled,
            bundlesNeeded: item.bundlesNeeded - item.bundlesFulfilled
          }))
        };
      })
    );

    const total = await Order.countDocuments(filter);

    res.json({
      orders: ordersWithNeededItems,
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

// Check product availability for dispatch
const checkProductAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('products.inventoryItemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.type !== 'dispatch') {
      return res.status(400).json({ message: 'Availability check is only for dispatch orders' });
    }

    let canDispatch = true;
    const availabilityResults = [];
    const neededItems = [];

    for (const product of order.products) {
      const inventoryItem = await Inventory.findById(product.inventoryItemId);
      if (!inventoryItem) {
        canDispatch = false;
        availabilityResults.push({
          productName: product.name,
          dimensions: product.dimensions,
          requested: product.quantity,
          available: 0,
          status: 'not_found',
          message: 'Product not found in inventory'
        });
        continue;
      }

      let availableQuantity = 0;
      let dimensionInfo = null;

      if (inventoryItem.type === 'finished_product' && inventoryItem.dimensions && inventoryItem.dimensions.length > 0 && product.dimensionId) {
        // For finished products with dimensions, check specific dimension availability
        const dimension = inventoryItem.dimensions.id(product.dimensionId);
        if (dimension) {
          availableQuantity = dimension.availableQuantity;
          dimensionInfo = {
            dimension: dimension.dimension,
            sku: dimension.sku,
            totalQuantity: dimension.quantity,
            reservedQuantity: dimension.reservedQuantity,
            availableQuantity: dimension.availableQuantity,
            bundles: dimension.bundles
          };
        }
      } else {
        // For raw materials and simple inventory
        availableQuantity = inventoryItem.availableQuantity || 0;
      }

      const isAvailable = availableQuantity >= product.quantity;
      
      if (!isAvailable) {
        canDispatch = false;
        const shortfall = product.quantity - availableQuantity;
        
        neededItems.push({
          productName: inventoryItem.name,
          dimensions: product.dimensions || '',
          quantityNeeded: shortfall,
          inventoryItemId: inventoryItem._id,
          dimensionId: product.dimensionId
        });
      }

      availabilityResults.push({
        productName: product.name,
        dimensions: product.dimensions,
        requested: product.quantity,
        available: availableQuantity,
        status: isAvailable ? 'available' : 'insufficient',
        message: isAvailable 
          ? 'Available for dispatch' 
          : `Need ${shortfall} more units (${availableQuantity}/${product.quantity} available)`,
        dimensionInfo
      });
    }

    // Update order's canDispatch status
    order.canDispatch = canDispatch;
    await order.save();

    res.json({
      message: canDispatch ? 'All products available for dispatch' : 'Some products need restocking',
      canDispatch,
      availabilityResults,
      neededItems: neededItems.length > 0 ? neededItems : null,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        canDispatch: order.canDispatch,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Check product availability error:', error);
    res.status(500).json({ message: 'Server error checking product availability' });
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

    // Add needed items information
    const neededItems = await NeededItem.find({
      'orderReference.orderId': order._id,
      status: { $in: ['pending', 'partially_fulfilled'] }
    });

    const orderWithNeededItems = {
      ...order.toObject(),
      neededItems: neededItems.map(item => ({
        productName: item.productName,
        dimensions: item.dimensions,
        quantityNeeded: item.quantityNeeded - item.quantityFulfilled,
        bundlesNeeded: item.bundlesNeeded - item.bundlesFulfilled
      }))
    };

    res.json({ order: orderWithNeededItems });

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
    if (!canTransition(order.type, order.status, status)) {
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

// Approve dispatch order (when dispatch button is clicked)
const approveDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle } = req.body;

    const order = await Order.findById(id).populate('products.inventoryItemId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.type !== 'dispatch') {
      return res.status(400).json({ message: 'This action is only for dispatch orders' });
    }

    if (order.status !== 'draft') {
      return res.status(400).json({ message: 'Order is not in draft status' });
    }

    // Check if there are any pending needed items for this order
    const pendingNeededItems = await NeededItem.find({
      'orderReference.orderId': order._id,
      status: { $in: ['pending', 'partially_fulfilled'] }
    });

    if (pendingNeededItems.length > 0) {
      return res.status(400).json({
        message: 'Cannot dispatch - items still needed',
        neededItems: pendingNeededItems.map(item => ({
          productName: item.productName,
          dimensions: item.dimensions,
          quantityNeeded: item.quantityNeeded - item.quantityFulfilled,
          bundlesNeeded: item.bundlesNeeded
        })),
        order
      });
    }

    // Validate vehicle information
    if (!vehicle || !vehicle.number || !vehicle.driverName || !vehicle.driverNumber) {
      return res.status(400).json({ 
        message: 'Vehicle information is required for dispatch approval.' 
      });
    }

    // Re-check availability and reserve inventory
    let canDispatch = true;
    const blockedReasons = [];

    for (const product of order.products) {
      const inventoryItem = await Inventory.findById(product.inventoryItemId);
      if (!inventoryItem) {
        return res.status(400).json({ 
          message: `Inventory item not found for product: ${product.name}` 
        });
      }

      let availableQuantity = 0;
      
      if (inventoryItem.type === 'finished_product' && inventoryItem.dimensions && inventoryItem.dimensions.length > 0 && product.dimensionId) {
        // For finished products with dimensions, check specific dimension availability
        const dimension = inventoryItem.dimensions.id(product.dimensionId);
        availableQuantity = dimension ? dimension.availableQuantity : 0;
      } else {
        // For raw materials and simple inventory
        availableQuantity = inventoryItem.availableQuantity || 0;
      }

      if (availableQuantity < product.quantity) {
        canDispatch = false;
        const shortfall = product.quantity - availableQuantity;
        
        // Create needed item automatically
        const neededItemData = {
          productName: inventoryItem.name,
          dimensions: product.dimensions || '',
          quantityNeeded: shortfall,
          bundlesNeeded: Math.ceil(shortfall / (inventoryItem.bundleSize || 1)),
          inventoryItemId: inventoryItem._id,
          dimensionId: product.dimensionId,
          orderReference: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerOrSupplier: order.customerOrSupplier
          },
          priority: order.priority || 'medium',
          createdBy: req.user._id
        };

        await NeededItem.create(neededItemData);
        
        blockedReasons.push(`${product.name} - Need ${shortfall} more (${availableQuantity}/${product.quantity} available)`);
      } else {
        // Reserve inventory
        if (inventoryItem.type === 'finished_product' && inventoryItem.dimensions && inventoryItem.dimensions.length > 0 && product.dimensionId) {
          // Handle finished products with dimensions
          const dimension = inventoryItem.dimensions.id(product.dimensionId);
          if (dimension && dimension.availableQuantity >= product.quantity) {
            dimension.reservedQuantity += product.quantity;
            dimension.availableQuantity = dimension.quantity - dimension.reservedQuantity;
          } else {
            canDispatch = false;
            blockedReasons.push(`${product.name} - Insufficient stock in dimension ${product.dimensions}`);
          }
        } else {
          // Handle raw materials and simple inventory
          inventoryItem.reservedQuantity += product.quantity;
          inventoryItem.availableQuantity = inventoryItem.quantity - inventoryItem.reservedQuantity;
        }
        
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      }
    }

    if (!canDispatch) {
      // Update order status
      order.canDispatch = false;
      order.isBlocked = true;
      order.blockedReason = blockedReasons.join('; ');
      order.blockedAt = new Date();
      order.blockedBy = req.user._id;

      order.history.push({
        by: req.user._id,
        from: order.status,
        to: order.status,
        note: `Dispatch blocked - insufficient inventory: ${blockedReasons.join('; ')}`,
        at: new Date()
      });

      await order.save();

      // Get the created needed items for response
      const createdNeededItems = await NeededItem.find({
        'orderReference.orderId': order._id,
        status: { $in: ['pending', 'partially_fulfilled'] }
      });

      return res.status(400).json({
        message: 'Cannot dispatch - insufficient inventory. Needed items have been created.',
        neededItems: createdNeededItems.map(item => ({
          productName: item.productName,
          dimensions: item.dimensions,
          quantityNeeded: item.quantityNeeded,
          bundlesNeeded: item.bundlesNeeded
        })),
        order
      });
    }

    // Update order with vehicle info and change status
    order.vehicle = vehicle;
    order.status = 'pending_guard_approval';
    order.canDispatch = true;
    order.isBlocked = false;
    order.blockedReason = null;

    order.history.push({
      by: req.user._id,
      from: 'draft',
      to: 'pending_guard_approval',
      note: 'Dispatch approved - inventory reserved, vehicle assigned',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Dispatch approved successfully',
      order
    });

  } catch (error) {
    console.error('Approve dispatch error:', error);
    res.status(500).json({ message: 'Server error approving dispatch' });
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
    const { bundles, totalLoadedWeight, productLoads } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update loading details
    order.loadingDetails = {
      acceptedBy: req.user._id,
      bundles,
      totalLoadedWeight,
      productLoads
    };

    // Update status
    order.status = 'inside_factory_pending_final_weight';
    order.history.push({
      by: req.user._id,
      from: 'inside_factory_pending_loading',
      to: 'inside_factory_pending_final_weight',
      note: `Loading completed. ${bundles} bundles, ${totalLoadedWeight}kg total`,
      at: new Date()
    });

    await order.save();

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

    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: newStatus,
      note: `Final weight recorded: ${finalWeight}kg, Net: ${order.netWeight}kg`,
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
    const { 
      amount, 
      RatePerUnit, 
      TaxPercentage, 
      invoiceNotes,
      billingPartyName,
      billingPartyAddress,
      billingPartyGSTIN,
      billingPartyContact,
      billingPartyEmail,
      billingPartyState,
      billingPartyPincode,
      companyName,
      companyAddress,
      companyGSTIN,
      companyContact,
      companyEmail
    } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if fare has been recorded for this order
    const { Fare } = require('../models');
    const fare = await Fare.findOne({ orderId: id });
    if (!fare) {
      return res.status(400).json({ 
        message: 'Fare must be recorded before generating invoice. Please record the vehicle fare first.' 
      });
    }

    // Generate bill number
    const billNumber = Math.floor(Math.random() * 1000000);

    // Update invoice with all details
    order.invoice = {
      billNumber,
      amount,
      RatePerUnit,
      TaxPercentage,
      invoiceNotes,
      billingParty: {
        name: billingPartyName || order.customerOrSupplier,
        address: billingPartyAddress || '',
        gstin: billingPartyGSTIN || '',
        contact: billingPartyContact || '',
        email: billingPartyEmail || '',
        state: billingPartyState || '',
        pincode: billingPartyPincode || ''
      },
      company: {
        name: companyName || 'BHOPAL ISPAT PVT. LTD.',
        address: companyAddress || 'Survey No.402/1/1/1, Sukhlisewania,\nVidisha Road, BHOPAL - 462023',
        gstin: companyGSTIN || '23AAKCB2691R1Z3',
        contact: companyContact || '9827053499',
        email: companyEmail || 'bhopalispatlimited@gmail.com'
      }
    };

    // Don't change status when generating invoice - only add to history
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: order.status,
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

// Move order to gate (change status to ready for dispatch/exit)
const moveToGate = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if invoice exists
    if (!order.invoice) {
      return res.status(400).json({ 
        message: 'Invoice must be generated before moving to gate.' 
      });
    }

    // Update status to ready for dispatch/exit
    const newStatus = order.type === 'dispatch' 
      ? 'ready_for_dispatch'
      : 'ready_for_exit_purchase';

    order.status = newStatus;
    order.history.push({
      by: req.user._id,
      from: order.status,
      to: newStatus,
      note: 'Order moved to gate for exit processing',
      at: new Date()
    });

    await order.save();

    res.json({
      message: 'Order moved to gate successfully',
      order
    });

  } catch (error) {
    console.error('Move to gate error:', error);
    res.status(500).json({ message: 'Server error moving order to gate' });
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

    // Update status to completed
    order.status = 'completed';
    order.history.push({
      by: req.user._id,
      from: order.status,
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
  debugOrderValidation,
  createOrder,
  checkProductAvailability,
  approveDispatch,
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
  moveToGate,
  exitOrder,
  updateOrdersAvailabilityAfterInventoryChange,
  updateNeededItemsForOrder
};