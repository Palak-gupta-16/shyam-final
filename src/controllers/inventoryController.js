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
    const { sku, type, name, dimensions, quantity,length, unit, location, description, minimumStock, maxStock } = req.body;

    // Check if SKU already exists
    const existingItem = await Inventory.findOne({ sku });
    if (existingItem) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // Create new inventory item
    const item = new Inventory({
      sku,
      type,
      name,
      dimensions,
      quantity,
length,
      unit: unit || 'mt',
      location,
      description,
      minimumStock: minimumStock || 0,
      maxStock,
      lastUpdatedBy: req.user._id
    });

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

// Update inventory item quantity with stock validation
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, action = 'set' } = req.body; // action can be 'set', 'add', 'subtract'

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    let newQuantity;
    switch (action) {
      case 'add':
        newQuantity = item.quantity + quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, item.quantity - quantity);
        break;
      default:
        newQuantity = quantity;
    }

    // Validate that we don't go below reserved quantity
    if (newQuantity < item.reservedQuantity) {
      return res.status(400).json({ 
        message: `Cannot reduce quantity below reserved amount (${item.reservedQuantity})` 
      });
    }

    // Update quantity and last updated by
    item.quantity = newQuantity;
    item.lastUpdatedBy = req.user._id;

    await item.save();

    // Check if this update can fulfill any blocked orders
    await checkAndFulfillBlockedOrders(item);

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

// Reserve inventory for an order
const reserveInventory = async (req, res) => {
  try {
    const { inventoryItemId, quantity, orderId } = req.body;

    const item = await Inventory.findById(inventoryItemId);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const reserved = item.reserveQuantity(quantity);
    if (!reserved) {
      return res.status(400).json({ 
        message: `Insufficient stock. Available: ${item.availableQuantity}, Requested: ${quantity}` 
      });
    }

    item.lastUpdatedBy = req.user._id;
    await item.save();

    res.json({
      message: 'Inventory reserved successfully',
      item: {
        _id: item._id,
        name: item.name,
        availableQuantity: item.availableQuantity,
        reservedQuantity: item.reservedQuantity
      }
    });

  } catch (error) {
    console.error('Reserve inventory error:', error);
    res.status(500).json({ message: 'Server error reserving inventory' });
  }
};

// Helper function to check and fulfill blocked orders
const checkAndFulfillBlockedOrders = async (inventoryItem) => {
  try {
    if (inventoryItem.availableQuantity <= 0 || inventoryItem.blockedOrders.length === 0) {
      return;
    }

    // Sort blocked orders by priority and date
    const sortedBlockedOrders = inventoryItem.blockedOrders.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return new Date(a.dateBlocked) - new Date(b.dateBlocked); // Earlier date first
    });

    let availableQty = inventoryItem.availableQuantity;
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
        inventoryItem.blockedOrders = inventoryItem.blockedOrders.filter(
          b => b.orderId.toString() !== orderToFulfill.orderId.toString()
        );

        // Reserve the inventory
        inventoryItem.reserveQuantity(orderToFulfill.quantityNeeded);
      }
    }

    if (ordersToFulfill.length > 0) {
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
  checkAndFulfillBlockedOrders
};