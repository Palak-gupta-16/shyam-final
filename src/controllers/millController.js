const { MillHourlyReport, MillDailySummary, Inventory } = require('../models');
const { checkAndFulfillBlockedOrders } = require('./inventoryController');

// Create hourly report
const createHourlyReport = async (req, res) => {
  try {
    const { date, hour, billetSize, piecesProduced, missRolls, breakdowns, shift, operatorName, remarks } = req.body;

    // Check if report already exists for this date and hour
    const existingReport = await MillHourlyReport.findOne({ date, hour });
    if (existingReport) {
      return res.status(400).json({ 
        message: 'Hourly report already exists for this date and hour' 
      });
    }

    const report = new MillHourlyReport({
      date,
      hour,
      billetSize,
      piecesProduced,
      missRolls,
      breakdowns,
      shift,
      operatorName,
      remarks,
      createdBy: req.user._id
    });

    await report.save();

    // Populate the createdBy field for response
    await report.populate('createdBy', 'name alias role');

    res.status(201).json({
      message: 'Hourly report created',
      report
    });

  } catch (error) {
    console.error('Create hourly report error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error creating hourly report' });
  }
};

// Create daily mill summary with robust raw material validation
const createDailySummary = async (req, res) => {
  try {
    console.log('Create daily summary request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      date, 
      rawMaterials, 
      finishedProduct,
      wasteMaterials,
      totalPieces, 
      totalWeight, 
      breakdownSummary, 
      productionHours, 
      efficiency, 
      remarks 
    } = req.body;

    // Check if summary already exists for this date
    const existingSummary = await MillDailySummary.findOne({ date });
    if (existingSummary) {
      return res.status(400).json({ 
        message: 'Daily summary already exists for this date' 
      });
    }

    // Validate finished product inventory item is provided
    if (!finishedProduct || !finishedProduct.inventoryItemId) {
      return res.status(400).json({
        message: 'Finished product inventory item must be selected from existing inventory'
      });
    }

    // Validate dimensions are provided
    if (!finishedProduct.dimensions || finishedProduct.dimensions.length === 0) {
      return res.status(400).json({
        message: 'At least one dimension with bundles and quantity must be specified'
      });
    }

    // Validate that finished product exists
    const finishedProductItem = await Inventory.findById(finishedProduct.inventoryItemId);
    if (!finishedProductItem) {
      return res.status(400).json({
        message: 'Selected finished product inventory item not found'
      });
    }

    // Validate finished product type
    if (finishedProductItem.type !== 'finished_product') {
      return res.status(400).json({
        message: 'Selected item must be a finished product'
      });
    }

    // Validate raw materials availability
    const materialValidation = await validateRawMaterials(rawMaterials);
    if (!materialValidation.valid) {
      return res.status(400).json({
        message: 'Insufficient raw materials for production',
        errors: materialValidation.errors,
        missingMaterials: materialValidation.missingMaterials
      });
    }

    // Process waste materials (create inventory items if they don't exist)
    const processedWasteMaterials = await processWasteMaterials(wasteMaterials || [], req.user._id);

    // Create the mill daily summary
    const summary = new MillDailySummary({
      date,
      name: finishedProductItem.name, // Use name from inventory item
      dimensions: Array.isArray(finishedProductItem.dimensions) 
        ? finishedProductItem.dimensions.map(d => d.dimension).join(', ')
        : finishedProductItem.dimensions || '', // Convert array to string
      rawMaterials: materialValidation.processedMaterials,
      finishedProduct: {
        inventoryItemId: finishedProductItem._id,
        dimensions: finishedProduct.dimensions
      },
      wasteMaterials: processedWasteMaterials,
      totalPieces,
      totalWeight,
      breakdownSummary,
      createdBy: req.user._id,
      productionHours,
      efficiency,
      remarks
    });

    await summary.save();

    // Process inventory changes
    await processInventoryChanges(
      materialValidation.processedMaterials,
      finishedProductItem,
      finishedProduct.dimensions,
      processedWasteMaterials,
      req.user._id
    );

    // Populate the response
    await summary.populate('createdBy', 'name alias role');
    await summary.populate('rawMaterials.inventoryItemId', 'name sku availableQuantity');
    await summary.populate('finishedProduct.inventoryItemId', 'name sku quantity');

    res.status(201).json({
      message: 'Daily summary created successfully',
      summary,
      inventoryUpdates: {
        rawMaterialsConsumed: materialValidation.processedMaterials.length,
        finishedProductAdded: totalWeight
      }
    });

  } catch (error) {
    console.error('Create daily summary error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Daily summary already exists for this date' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error creating daily summary',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Validate raw materials availability
const validateRawMaterials = async (rawMaterials) => {
  const validationResult = {
    valid: true,
    errors: [],
    missingMaterials: [],
    processedMaterials: []
  };

  if (!rawMaterials || rawMaterials.length === 0) {
    validationResult.valid = false;
    validationResult.errors.push('No raw materials specified');
    return validationResult;
  }

  for (const material of rawMaterials) {
    // Require inventoryItemId for all raw materials
    if (!material.inventoryItemId) {
      validationResult.valid = false;
      validationResult.errors.push(`Raw material "${material.materialName}" must have a valid inventory item selected`);
      validationResult.missingMaterials.push({
        name: material.materialName,
        quantityNeeded: material.quantityUsed,
        available: 0
      });
      continue;
    }

    const inventoryItem = await Inventory.findById(material.inventoryItemId);
    if (!inventoryItem) {
      validationResult.valid = false;
      validationResult.errors.push(`Raw material inventory item not found: ${material.materialName}`);
      validationResult.missingMaterials.push({
        name: material.materialName,
        quantityNeeded: material.quantityUsed,
        available: 0
      });
      continue;
    }

    // Validate item type
    if (inventoryItem.type !== 'raw_material') {
      validationResult.valid = false;
      validationResult.errors.push(`Item "${material.materialName}" is not a raw material`);
      continue;
    }

    // Check if sufficient quantity is available (only warn, don't block)
    if (inventoryItem.availableQuantity < material.quantityUsed) {
      console.warn(
        `Warning: Insufficient "${material.materialName}". Required: ${material.quantityUsed}, Available: ${inventoryItem.availableQuantity}`
      );
      // Still allow the operation but log the warning
    }

    // Add to processed materials
    validationResult.processedMaterials.push({
      inventoryItemId: inventoryItem._id,
      materialName: inventoryItem.name, // Use name from inventory item
      quantityUsed: material.quantityUsed,
      unit: inventoryItem.unit
    });
  }

  return validationResult;
};

// Process waste materials - create inventory items if they don't exist
const processWasteMaterials = async (wasteMaterials, userId) => {
  const processedWaste = [];
  
  try {
    console.log('Processing waste materials:', wasteMaterials);
    
    for (const waste of wasteMaterials) {
      if (!waste.materialName || !waste.quantity) {
        console.log('Skipping waste material with missing data:', waste);
        continue;
      }
      
      // Check if waste material already exists in inventory
      let wasteItem = await Inventory.findOne({
        name: waste.materialName,
        type: 'waste_material'
      });
      
      if (!wasteItem) {
        console.log('Creating new waste material:', waste.materialName);
        // Create new waste material inventory item
        wasteItem = new Inventory({
          name: waste.materialName,
          type: 'waste_material',
          unit: 'mt',
          quantity: waste.quantity,
          availableQuantity: waste.quantity,
          sku: `WASTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdBy: userId,
          lastUpdatedBy: userId
        });
        await wasteItem.save();
        console.log('Created waste material:', wasteItem.sku);
      } else {
        console.log('Updating existing waste material:', waste.materialName);
        // Update existing waste material quantity
        wasteItem.quantity += waste.quantity;
        wasteItem.availableQuantity += waste.quantity;
        wasteItem.lastUpdatedBy = userId;
        await wasteItem.save();
      }
      
      processedWaste.push({
        materialName: waste.materialName,
        quantity: waste.quantity,
        unit: 'mt'
      });
    }
    
    console.log('Processed waste materials:', processedWaste);
    return processedWaste;
  } catch (error) {
    console.error('Error processing waste materials:', error);
    throw error;
  }
};

// Process inventory changes after mill production
const processInventoryChanges = async (rawMaterials, finishedProductItem, dimensions, wasteMaterials, userId) => {
  try {
    console.log('Processing inventory changes...');
    console.log('Raw materials:', rawMaterials);
    console.log('Finished product item:', finishedProductItem.name);
    console.log('Dimensions to add:', dimensions);
    
    // Consume raw materials
    for (const material of rawMaterials) {
      console.log('Processing raw material:', material.materialName);
      const inventoryItem = await Inventory.findById(material.inventoryItemId);
      if (inventoryItem) {
        console.log('Found inventory item, consuming:', material.quantityUsed);
        const consumed = inventoryItem.consumeInventory(material.quantityUsed);
        if (consumed) {
          inventoryItem.lastUpdatedBy = userId;
          await inventoryItem.save();
          console.log('Raw material consumed successfully');
        } else {
          console.log('Failed to consume raw material');
        }
      } else {
        console.log('Raw material inventory item not found');
      }
    }

    // Update finished product inventory for each dimension
    console.log('Updating finished product dimensions...');
    for (const dim of dimensions) {
      console.log('Processing dimension:', dim.dimension, 'quantity:', dim.quantity, 'bundles:', dim.bundles);
      
      // Find the specific dimension in the inventory item
      const dimensionIndex = finishedProductItem.dimensions.findIndex(
        d => d.dimension === dim.dimension
      );
      
      if (dimensionIndex !== -1) {
        console.log('Found existing dimension at index:', dimensionIndex);
        // Update existing dimension
        finishedProductItem.dimensions[dimensionIndex].quantity += dim.quantity;
        finishedProductItem.dimensions[dimensionIndex].bundles += dim.bundles;
        finishedProductItem.dimensions[dimensionIndex].availableQuantity += dim.quantity;
        console.log('Updated dimension:', finishedProductItem.dimensions[dimensionIndex]);
      } else {
        console.log('Creating new dimension');
        // Add new dimension if it doesn't exist
        const newDimension = {
          dimension: dim.dimension,
          quantity: dim.quantity,
          bundles: dim.bundles,
          availableQuantity: dim.quantity,
          sku: `${finishedProductItem.sku}-${dim.dimension.replace(/[^a-zA-Z0-9]/g, '')}`
        };
        finishedProductItem.dimensions.push(newDimension);
        console.log('Added new dimension:', newDimension);
      }
    }

    // Update total quantity
    finishedProductItem.quantity = finishedProductItem.dimensions.reduce(
      (total, dim) => total + dim.quantity, 0
    );
    finishedProductItem.availableQuantity = finishedProductItem.dimensions.reduce(
      (total, dim) => total + dim.availableQuantity, 0
    );
    
    finishedProductItem.lastUpdatedBy = userId;
    await finishedProductItem.save();

    // Check if this production fulfills any blocked orders
    await checkAndFulfillBlockedOrders(finishedProductItem);

  } catch (error) {
    console.error('Error processing inventory changes:', error);
    throw error;
  }
};



// Get available raw materials for mill production
const getAvailableRawMaterials = async (req, res) => {
  try {
    const rawMaterials = await Inventory.find({
      type: 'raw_material',
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    })
    .select('_id name dimensions sku quantity availableQuantity unit status type')
    .sort({ name: 1 });

    res.json({
      message: 'Raw materials retrieved',
      materials: rawMaterials
    });

  } catch (error) {
    console.error('Get raw materials error:', error);
    res.status(500).json({ message: 'Server error fetching raw materials' });
  }
};

// Get finished products for selection
const getAvailableFinishedProducts = async (req, res) => {
  try {
    const finishedProducts = await Inventory.find({
      type: 'finished_product',
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    })
    .select('_id name dimensions sku quantity availableQuantity unit status type')
    .sort({ name: 1 });

    res.json({
      message: 'Finished products retrieved',
      products: finishedProducts
    });

  } catch (error) {
    console.error('Get finished products error:', error);
    res.status(500).json({ message: 'Server error fetching finished products' });
  }
};

// Stock take functionality (existing)
const stockTake = async (req, res) => {
  try {
    const { inventoryItemId, quantity } = req.body;

    if (!inventoryItemId) {
      return res.status(400).json({
        message: 'Inventory item must be selected from existing inventory'
      });
    }

    // Find existing inventory item
    const inventoryItem = await Inventory.findById(inventoryItemId);
    if (!inventoryItem) {
      return res.status(400).json({
        message: 'Selected inventory item not found'
      });
    }

    // Update existing item quantity
    inventoryItem.quantity = quantity;
    inventoryItem.lastUpdatedBy = req.user._id;
    await inventoryItem.save();

    res.status(200).json({
      message: 'Stock take recorded',
      item: inventoryItem
    });

  } catch (error) {
    console.error('Stock take error:', error);
    res.status(500).json({ message: 'Server error recording stock take' });
  }
};

// Get hourly reports
const getHourlyReports = async (req, res) => {
  try {
    const { date, shift, page = 1, perPage = 50 } = req.query;
    
    let filter = {};
    
    if (date) {
      filter.date = date;
    }
    
    if (shift) {
      filter.shift = shift;
    }

    const skip = (page - 1) * perPage;

    const reports = await MillHourlyReport.find(filter)
      .populate('createdBy', 'name alias')
      .sort({ date: -1, hour: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    const total = await MillHourlyReport.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / perPage),
        perPage: parseInt(perPage)
      }
    });

  } catch (error) {
    console.error('Get hourly reports error:', error);
    res.status(500).json({ message: 'Server error fetching hourly reports' });
  }
};

// Get daily summaries
const getDailySummaries = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, perPage = 20 } = req.query;

    let filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const skip = (page - 1) * perPage;

    const summaries = await MillDailySummary.find(filter)
      .populate('createdBy', 'name alias')
      .populate('rawMaterials.inventoryItemId', 'name sku')
      .populate('finishedProduct.inventoryItemId', 'name sku quantity')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    const total = await MillDailySummary.countDocuments(filter);

    res.json({
      summaries,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / perPage),
        perPage: parseInt(perPage)
      }
    });

  } catch (error) {
    console.error('Get daily summaries error:', error);
    res.status(500).json({ message: 'Server error fetching daily summaries' });
  }
};

module.exports = {
  createHourlyReport,
  createDailySummary,
  getAvailableRawMaterials,
  getAvailableFinishedProducts,
  stockTake,
  getHourlyReports,
  getDailySummaries
};