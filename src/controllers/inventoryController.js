const { Inventory, Order } = require('../models');

// Get all inventory with advanced filtering
const getInventory = async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 50 } = req.query;
    
    let filter = {
      // Exclude system-generated needed items from regular inventory view
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    };
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const inventory = await Inventory.find(filter)
      .populate('lastUpdatedBy', 'name alias')
      .populate('blockedOrders.orderId', 'orderNumber status type')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(filter);

    res.json({
      inventory,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error fetching inventory' });
  }
};

// Add new inventory item
const addInventoryItem = async (req, res) => {
  try {
    const { sku, type, name, dimensions, quantity, bundles, minimumStock, maxStock, length, unit, location, description } = req.body;

    // Check if SKU already exists (only if provided)
    if (sku) {
      const existingItem = await Inventory.findOne({ sku });
      if (existingItem) {
        return res.status(400).json({ message: 'Base SKU already exists' });
      }
    }

    let itemData = {
      ...(sku && { sku }), // Only include SKU if provided
      type,
      name,
      length,
      unit: unit || 'pieces',
      location,
      description,
      lastUpdatedBy: req.user._id
    };

    if (type === 'finished_product') {
      // For finished products - validate dimensions array
      if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) {
        return res.status(400).json({ message: 'At least one dimension is required for finished products' });
      }

      itemData.dimensions = dimensions.map(dim => ({
        dimension: dim.dimension,
        quantity: dim.quantity || 0,
        bundles: dim.bundles || 0,
        minimumStock: dim.minimumStock || 0,
        maxStock: dim.maxStock
      }));
    } else {
      // For raw materials and store items - use simple quantity
      itemData = {
        ...itemData,
        quantity: quantity || 0,
        bundles: bundles || 0,
        minimumStock: minimumStock || 0,
        maxStock
      };
    }

    // Create new inventory item
    const item = new Inventory(itemData);
    await item.save();

    // Populate the lastUpdatedBy field for response
    await item.populate('lastUpdatedBy', 'name alias');

    res.status(201).json({
      message: 'Item added successfully',
      item
    });

  } catch (error) {
    console.error('Add inventory item error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error adding inventory item' });
  }
};

// Update inventory item dimension quantity with stock validation
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { dimensionId, quantity, bundles, action = 'set' } = req.body;

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const dimension = item.dimensions.id(dimensionId);
    if (!dimension) {
      return res.status(404).json({ message: 'Dimension not found' });
    }

    let newQuantity;
    switch (action) {
      case 'add':
        newQuantity = dimension.quantity + quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, dimension.quantity - quantity);
        break;
      default:
        newQuantity = quantity;
    }

    // Validate that we don't go below reserved quantity
    if (newQuantity < dimension.reservedQuantity) {
      return res.status(400).json({ 
        message: `Cannot reduce quantity below reserved amount (${dimension.reservedQuantity})` 
      });
    }

    // Update dimension quantity and bundles
    dimension.quantity = newQuantity;
    if (bundles !== undefined) {
      dimension.bundles = bundles;
    }
    item.lastUpdatedBy = req.user._id;

    await item.save();

    // Check if this update can fulfill any blocked orders
    await checkAndFulfillBlockedOrders(item, dimensionId);

    // Populate the lastUpdatedBy field for response
    await item.populate('lastUpdatedBy', 'name alias');

    res.status(200).json({
      message: 'Inventory updated successfully',
      item
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error updating inventory item' });
  }
};

// Get inventory by type
const getInventoryByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { available_only = false } = req.query;
    
    let filter = { 
      type,
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    };
    
    if (available_only === 'true') {
      filter.availableQuantity = { $gt: 0 };
      filter.status = { $in: ['available', 'low_stock'] };
    }

    const inventory = await Inventory.find(filter)
      .populate('lastUpdatedBy', 'name alias')
      .sort({ name: 1, dimensions: 1 });

    res.json(inventory);

  } catch (error) {
    console.error('Get inventory by type error:', error);
    res.status(500).json({ message: 'Server error fetching inventory by type' });
  }
};

// Get low stock items
const getLowStockItems = async (req, res) => {
  try {
    const inventory = await Inventory.find({
      status: { $in: ['low_stock', 'out_of_stock'] }
    })
    .populate('lastUpdatedBy', 'name alias')
    .sort({ quantity: 1 });

    res.json({
      message: 'Low stock items retrieved',
      inventory
    });

  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Server error fetching low stock items' });
  }
};

// Search inventory
const searchInventory = async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    let filter = {
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    if (type && type !== 'all') {
      filter.type = type;
    }

    const inventory = await Inventory.find(filter)
      .populate('lastUpdatedBy', 'name alias')
      .sort({ name: 1 })
      .limit(20);

    res.json({
      message: 'Search completed',
      inventory
    });

  } catch (error) {
    console.error('Search inventory error:', error);
    res.status(500).json({ message: 'Server error searching inventory' });
  }
};

// Get blocked orders and needed items
const getNeededItems = async (req, res) => {
  try {
    // Get inventory items with blocked orders
    const neededItems = await Inventory.find({
      $or: [
        { status: 'needed' },
        { blockedOrders: { $exists: true, $not: { $size: 0 } } }
      ]
    })
    .populate('blockedOrders.orderId', 'orderNumber customerOrSupplier type priority createdAt')
    .populate('lastUpdatedBy', 'name alias')
    .sort({ 'blockedOrders.dateBlocked': -1 });

    // Get blocked orders
    const blockedOrders = await Order.findBlockedOrders()
      .populate('products.inventoryItemId', 'name dimensions sku availableQuantity');

    res.json({
      message: 'Needed items and blocked orders retrieved',
      data: {
        neededItems,
        blockedOrders
      }
    });

  } catch (error) {
    console.error('Get needed items error:', error);
    res.status(500).json({ message: 'Server error fetching needed items' });
  }
};

// Reserve inventory for an order (dimension-specific)
const reserveInventory = async (req, res) => {
  try {
    const { inventoryItemId, dimensionId, quantity, orderId } = req.body;

    const item = await Inventory.findById(inventoryItemId);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const reserved = item.reserveQuantityForDimension(dimensionId, quantity);
    if (!reserved) {
      const dimension = item.dimensions.id(dimensionId);
      return res.status(400).json({ 
        message: `Insufficient stock. Available: ${dimension?.availableQuantity || 0}, Requested: ${quantity}` 
      });
    }

    item.lastUpdatedBy = req.user._id;
    await item.save();

    const dimension = item.dimensions.id(dimensionId);
    res.json({
      message: 'Inventory reserved successfully',
      item: {
        _id: item._id,
        name: item.name,
        dimension: {
          _id: dimension._id,
          dimension: dimension.dimension,
          sku: dimension.sku,
          availableQuantity: dimension.availableQuantity,
          reservedQuantity: dimension.reservedQuantity
        }
      }
    });

  } catch (error) {
    console.error('Reserve inventory error:', error);
    res.status(500).json({ message: 'Server error reserving inventory' });
  }
};

// Add new dimension to existing inventory item
const addDimensionToItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { dimension, quantity, bundles, minimumStock, maxStock } = req.body;

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if dimension already exists
    const existingDimension = item.dimensions.find(d => d.dimension === dimension);
    if (existingDimension) {
      return res.status(400).json({ message: 'Dimension already exists for this item' });
    }

    // Add new dimension
    const newDimension = item.addDimension({
      dimension,
      quantity: quantity || 0,
      bundles: bundles || 0,
      minimumStock: minimumStock || 0,
      maxStock
    });

    item.lastUpdatedBy = req.user._id;
    await item.save();

    await item.populate('lastUpdatedBy', 'name alias');

    res.status(201).json({
      message: 'Dimension added successfully',
      item,
      newDimension
    });

  } catch (error) {
    console.error('Add dimension error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Dimension SKU already exists' });
    }
    
    res.status(500).json({ message: 'Server error adding dimension' });
  }
};

// Get inventory item by dimension SKU
const getInventoryByDimensionSku = async (req, res) => {
  try {
    const { dimensionSku } = req.params;

    const item = await Inventory.findByDimensionSku(dimensionSku)
      .populate('lastUpdatedBy', 'name alias');

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const dimension = item.dimensions.find(d => d.sku === dimensionSku);

    res.json({
      item,
      dimension
    });

  } catch (error) {
    console.error('Get inventory by dimension SKU error:', error);
    res.status(500).json({ message: 'Server error fetching inventory' });
  }
};

// Helper function to check and fulfill blocked orders (dimension-specific)
const checkAndFulfillBlockedOrders = async (inventoryItem, dimensionId = null) => {
  try {
    const dimensionsToCheck = dimensionId 
      ? [inventoryItem.dimensions.id(dimensionId)]
      : inventoryItem.dimensions;

    for (const dimension of dimensionsToCheck) {
      if (!dimension || dimension.availableQuantity <= 0 || dimension.blockedOrders.length === 0) {
        continue;
      }

      // Sort blocked orders by priority and date
      const sortedBlockedOrders = dimension.blockedOrders.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(a.dateBlocked) - new Date(b.dateBlocked); // Earlier date first
      });

      let availableQty = dimension.availableQuantity;
      const ordersToFulfill = [];

      for (const blockedOrder of sortedBlockedOrders) {
        if (availableQty >= blockedOrder.quantityNeeded) {
          ordersToFulfill.push(blockedOrder);
          availableQty -= blockedOrder.quantityNeeded;
        }
      }

      // Fulfill orders
      for (const orderToFulfill of ordersToFulfill) {
        const order = await Order.findById(orderToFulfill.orderId);
        if (order) {
          // Update order status and remove from blocked
          order.isBlocked = false;
          order.fulfilledAt = new Date();
          
          // Update product quantity fulfilled
          const product = order.products.find(p => 
            p.inventoryItemId && p.inventoryItemId.toString() === inventoryItem._id.toString()
          );
          if (product) {
            product.quantityFulfilled += orderToFulfill.quantityNeeded;
          }

          await order.save();

          // Remove from blocked orders list
          dimension.blockedOrders = dimension.blockedOrders.filter(
            b => b.orderId.toString() !== orderToFulfill.orderId.toString()
          );

          // Reserve the inventory
          inventoryItem.reserveQuantityForDimension(dimension._id, orderToFulfill.quantityNeeded);
        }
      }
    }

    if (inventoryItem.isModified()) {
      await inventoryItem.save();
    }

  } catch (error) {
    console.error('Error checking and fulfilling blocked orders:', error);
  }
};

module.exports = {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  getInventoryByType,
  getLowStockItems,
  searchInventory,
  getNeededItems,
  reserveInventory,
  addDimensionToItem,
  getInventoryByDimensionSku,
  checkAndFulfillBlockedOrders
};