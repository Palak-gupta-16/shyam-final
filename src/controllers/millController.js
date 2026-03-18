const { MillHourlyReport, MillDailySummary, Inventory } = require('../models');
const { checkAndFulfillBlockedOrders } = require('./inventoryController');

const getDayBounds = (dateInput) => {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getHourlyAggregation = (hourlyReports) => {
  const totalPieces = hourlyReports.reduce(
    (sum, report) =>
      sum + (report.finalProducts || []).reduce((productSum, product) => productSum + (Number(product.quantity) || 0), 0),
    0
  );

  const breakdownSummary = hourlyReports
    .flatMap((report) => report.breakdowns || [])
    .filter(Boolean)
    .join('; ');

  return {
    totalPieces,
    productionHours: hourlyReports.length,
    breakdownSummary,
  };
};

const buildElectricityPayload = (electricityReadings, userId) => {
  if (!electricityReadings) {
    return null;
  }

  const startReading = Number(electricityReadings.startReading);
  const endReading = Number(electricityReadings.endReading);

  if (!Number.isFinite(startReading) || !Number.isFinite(endReading) || startReading < 0 || endReading < 0) {
    return { error: 'Electricity readings must be non-negative numbers' };
  }

  if (endReading < startReading) {
    return { error: 'Electricity end reading must be greater than or equal to start reading' };
  }

  return {
    startReading,
    endReading,
    consumption: endReading - startReading,
    capturedAt: new Date(),
    capturedBy: userId,
  };
};

// Create hourly report with new structure (final products, raw materials, waste)
const createHourlyReport = async (req, res) => {
  try {
    const { date, hour, finalProducts, rawMaterialsConsumed, wasteProducts, breakdowns, shift, operatorName, remarks } = req.body;

    // Validate final products
    if (!finalProducts || !Array.isArray(finalProducts) || finalProducts.length === 0) {
      return res.status(400).json({ message: 'At least one final product is required' });
    }

    // Process and validate final products
    const processedFinalProducts = [];
    for (const product of finalProducts) {
      if (!product.productId) {
        return res.status(400).json({ message: 'Product ID is required for each final product' });
      }

      if (!product.dimension || product.dimension.trim() === '') {
        return res.status(400).json({ message: 'Size/Dimension is required for each final product' });
      }

      const inventoryItem = await Inventory.findById(product.productId);
      if (!inventoryItem || inventoryItem.type !== 'finished_product') {
        return res.status(400).json({ message: 'Invalid finished product selected' });
      }

      processedFinalProducts.push({
        productId: inventoryItem._id,
        productName: inventoryItem.name,
        dimension: product.dimension,
        quantity: product.quantity || 0
      });

      // Add quantity to inventory (size-based for finished products)
      if (inventoryItem.type === 'finished_product' && product.dimension) {
        // Find if the size already exists
        const existingSizeIndex = inventoryItem.sizes.findIndex(
          (size) => size.dimension === product.dimension
        );

        if (existingSizeIndex !== -1) {
          // Size exists, add to its quantity
          inventoryItem.sizes[existingSizeIndex].quantity += product.quantity || 0;
          inventoryItem.sizes[existingSizeIndex].availableQuantity += product.quantity || 0;
        } else {
          // Size doesn't exist, create new size entry
          inventoryItem.sizes.push({
            dimension: product.dimension,
            quantity: product.quantity || 0,
            reservedQuantity: 0,
            availableQuantity: product.quantity || 0
          });
        }

        // Also update the total quantity
        inventoryItem.quantity += product.quantity || 0;
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      } else {
        // Legacy method if no dimension specified (shouldn't happen)
        inventoryItem.quantity += product.quantity || 0;
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      }
    }

    // Process and validate raw materials consumed
    const processedRawMaterials = [];
    if (rawMaterialsConsumed && Array.isArray(rawMaterialsConsumed)) {
      for (const material of rawMaterialsConsumed) {
        if (!material.materialId) {
          return res.status(400).json({ message: 'Material ID is required for each raw material' });
        }

        const inventoryItem = await Inventory.findById(material.materialId);
        if (!inventoryItem || inventoryItem.type !== 'raw_material') {
          return res.status(400).json({ message: 'Invalid raw material selected' });
        }

        // Check availability
        if (inventoryItem.quantity < (material.quantity || 0)) {
          return res.status(400).json({ 
            message: `Insufficient ${inventoryItem.name}. Available: ${inventoryItem.quantity}, Required: ${material.quantity}` 
          });
        }

        processedRawMaterials.push({
          materialId: inventoryItem._id,
          materialName: inventoryItem.name,
          quantity: material.quantity || 0,
          unit: material.unit || inventoryItem.unit
        });

        // Subtract from inventory
        inventoryItem.quantity -= material.quantity || 0;
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      }
    }

    // Process waste products
    const processedWasteProducts = [];
    if (wasteProducts && Array.isArray(wasteProducts)) {
      for (const waste of wasteProducts) {
        if (!waste.wasteId) {
          return res.status(400).json({ message: 'Waste ID is required for each waste product' });
        }

        const inventoryItem = await Inventory.findById(waste.wasteId);
        if (!inventoryItem || inventoryItem.type !== 'waste_material') {
          return res.status(400).json({ message: 'Invalid waste product selected' });
        }

        processedWasteProducts.push({
          wasteId: inventoryItem._id,
          wasteName: inventoryItem.name,
          quantity: waste.quantity || 0,
          unit: waste.unit || inventoryItem.unit
        });

        // Add to inventory
        inventoryItem.quantity += waste.quantity || 0;
        inventoryItem.lastUpdatedBy = req.user._id;
        await inventoryItem.save();
      }
    }

    const report = new MillHourlyReport({
      date,
      hour,
      finalProducts: processedFinalProducts,
      rawMaterialsConsumed: processedRawMaterials,
      wasteProducts: processedWasteProducts,
      breakdowns,
      shift,
      operatorName,
      remarks,
      createdBy: req.user._id
    });

    await report.save();
    await report.populate('createdBy', 'name alias role');

    res.status(201).json({
      message: 'Hourly report created and inventory updated',
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
    const { 
      date, 
      rawMaterials, 
      wasteMaterials,
      finishedProduct,
      billetSize, 
      totalPieces, 
      totalWeight, 
      breakdownSummary, 
      totalMissRolls, 
      productionHours, 
      efficiency, 
      remarks,
      electricityReadings
    } = req.body;

    // Check if summary already exists for this date
    const existingSummary = await MillDailySummary.findOne({ date });
    if (existingSummary) {
      return res.status(400).json({ 
        message: 'Daily summary already exists for this date' 
      });
    }

    const { start, end } = getDayBounds(date);
    const hourlyReports = await MillHourlyReport.find({
      date: { $gte: start, $lte: end },
    }).lean();
    const hourlyAggregation = getHourlyAggregation(hourlyReports);

    const electricityPayload = buildElectricityPayload(electricityReadings, req.user._id);
    if (electricityPayload && electricityPayload.error) {
      return res.status(400).json({ message: electricityPayload.error });
    }

    // Validate finished product inventory item is provided
    if (!finishedProduct || !finishedProduct.inventoryItemId) {
      return res.status(400).json({
        message: 'Finished product inventory item must be selected from existing inventory'
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

    // Validate dimension is provided for finished products
    if (!finishedProduct.dimension || finishedProduct.dimension.trim() === '') {
      return res.status(400).json({
        message: 'Size/Dimension is required for finished product'
      });
    }

    // Prevent selecting the same inventory item for finished product and waste
    if (wasteMaterials && Array.isArray(wasteMaterials)) {
      const conflict = wasteMaterials.some(w => w && w.inventoryItemId && String(w.inventoryItemId) === String(finishedProductItem._id));
      if (conflict) {
        return res.status(400).json({
          message: 'Waste material cannot be the same inventory item as the finished product. Please select a different inventory item for waste.'
        });
      }
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

  const wasteValidation = await validateWasteMaterials(wasteMaterials, req.user._id);
    if (!wasteValidation.valid) {
      return res.status(400).json({
        message: 'Waste material validation failed',
        errors: wasteValidation.errors
      });
    }

    // Create the mill daily summary
    const summary = new MillDailySummary({
      date,
      name: finishedProductItem.name, // Use name from inventory item
      dimensions: finishedProduct.dimension || finishedProductItem.dimensions, // Use the specific dimension being produced
      billetSize,
      rawMaterials: materialValidation.processedMaterials,
      finishedProduct: {
        inventoryItemId: finishedProductItem._id,
        quantityProduced: totalWeight,
        dimension: finishedProduct.dimension // Store the specific size/dimension
      },
      wasteMaterials: wasteValidation.processedMaterials,
      totalPieces: Number(totalPieces) > 0 ? Number(totalPieces) : hourlyAggregation.totalPieces,
      totalWeight,
      breakdownSummary: breakdownSummary || hourlyAggregation.breakdownSummary,
      createdBy: req.user._id,
      totalMissRolls,
      productionHours: Number(productionHours) > 0 ? Number(productionHours) : hourlyAggregation.productionHours,
      efficiency,
      electricity: electricityPayload || undefined,
      remarks
    });

    await summary.save();

    // Process inventory changes with dimension
    await processInventoryChanges(
      materialValidation.processedMaterials,
      finishedProductItem,
      totalWeight,
      wasteValidation.processedMaterials,
      req.user._id,
      finishedProduct.dimension // Pass the dimension to update specific size
    );

    // Populate the response
    await summary.populate('createdBy', 'name alias role');
    await summary.populate('submittedBy', 'name alias role');
    await summary.populate('rawMaterials.inventoryItemId', 'name sku availableQuantity');
    await summary.populate('finishedProduct.inventoryItemId', 'name sku quantity');
    await summary.populate('wasteMaterials.inventoryItemId', 'name sku quantity');

    res.status(201).json({
      message: 'Daily summary created successfully',
      summary,
      inventoryUpdates: {
        rawMaterialsConsumed: materialValidation.processedMaterials.length,
        rawMaterialsBreakdown: materialValidation.processedMaterials.map(({ materialName, quantityUsed, unit }) => ({
          materialName,
          quantityUsed,
          unit
        })),
        finishedProductAdded: totalWeight,
        finishedProductDetails: {
          materialName: finishedProductItem.name,
          quantityProduced: totalWeight,
          unit: finishedProductItem.unit
        },
        wasteMaterialsAdded: wasteValidation.processedMaterials.reduce((sum, waste) => sum + waste.quantityProduced, 0),
        wasteMaterialsBreakdown: wasteValidation.processedMaterials
      }
    });

  } catch (error) {
    console.error('Create daily summary error:', error);
    
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
    
    res.status(500).json({ message: 'Server error creating daily summary' });
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

    // Check if sufficient quantity is available
    if (inventoryItem.availableQuantity < material.quantityUsed) {
      validationResult.valid = false;
      validationResult.errors.push(
        `Insufficient "${material.materialName}". Required: ${material.quantityUsed}, Available: ${inventoryItem.availableQuantity}`
      );
      validationResult.missingMaterials.push({
        name: material.materialName,
        quantityNeeded: material.quantityUsed,
        available: inventoryItem.availableQuantity,
        shortfall: material.quantityUsed - inventoryItem.availableQuantity
      });
      continue;
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

// Validate waste material inputs and ensure waste inventory records exist
const validateWasteMaterials = async (wasteMaterials = [], userId) => {
  const validationResult = {
    valid: true,
    errors: [],
    processedMaterials: []
  };

  if (!Array.isArray(wasteMaterials) || wasteMaterials.length === 0) {
    return validationResult;
  }

  const wasteCache = new Map();

  const sanitizeSkuComponent = (value) => {
    if (!value) return 'AUTO';
    return value.toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16) || 'AUTO';
  };

  const ensureUniqueSku = async (baseSku) => {
    let finalSku = baseSku;
    let counter = 1;

    while (await Inventory.exists({ sku: finalSku })) {
      finalSku = `${baseSku}-${counter}`;
      counter += 1;
    }

    return finalSku;
  };

  const getWasteCacheKey = (baseItem, materialName) => {
    if (baseItem) {
      return `raw:${baseItem._id.toString()}`;
    }
    return `name:${(materialName || '').trim().toLowerCase()}`;
  };

  const ensureWasteInventoryItem = async ({ baseItem, materialName, unit }) => {
    const cacheKey = getWasteCacheKey(baseItem, materialName);
    if (wasteCache.has(cacheKey)) {
      return wasteCache.get(cacheKey);
    }

    let wasteItem = null;

    if (baseItem && baseItem.type === 'waste_material') {
      wasteItem = baseItem;
    } else if (baseItem && baseItem.type === 'raw_material') {
      const skuBase = `WASTE-${sanitizeSkuComponent(baseItem.sku || baseItem._id)}`;
      const wasteName = `Waste - ${baseItem.name}`;

      wasteItem = await Inventory.findOne({ sku: skuBase });
      if (!wasteItem) {
        wasteItem = await Inventory.findOne({ type: 'waste_material', name: wasteName });
      }

      if (!wasteItem) {
        const uniqueSku = await ensureUniqueSku(skuBase);
        wasteItem = new Inventory({
          sku: uniqueSku,
          type: 'waste_material',
          name: wasteName,
          dimensions: baseItem.dimensions,
          length: baseItem.length,
          quantity: 0,
          unit: unit || baseItem.unit || 'kg',
          location: baseItem.location,
          description: `Waste generated from ${baseItem.name}`,
          minimumStock: 0,
          maxStock: 0,
          lastUpdatedBy: userId
        });
        await wasteItem.save();
      }
    } else {
      const normalizedName = (materialName || 'General Waste').trim();
      const wasteName = normalizedName.toLowerCase().includes('waste') ? normalizedName : `Waste - ${normalizedName}`;
      const skuBase = `WASTE-${sanitizeSkuComponent(normalizedName)}`;

      wasteItem = await Inventory.findOne({ type: 'waste_material', name: wasteName });
      if (!wasteItem) {
        const uniqueSku = await ensureUniqueSku(skuBase);
        wasteItem = new Inventory({
          sku: uniqueSku,
          type: 'waste_material',
          name: wasteName,
          quantity: 0,
          unit: unit || 'kg',
          description: 'Auto-generated waste inventory item',
          minimumStock: 0,
          maxStock: 0,
          lastUpdatedBy: userId
        });
        await wasteItem.save();
      }
    }

    if (wasteItem) {
      wasteCache.set(cacheKey, wasteItem);
    }

    return wasteItem;
  };

  for (let index = 0; index < wasteMaterials.length; index += 1) {
    const material = wasteMaterials[index];
    if (!material) {
      continue;
    }

  const hasSelection = Boolean(material.inventoryItemId);
  const hasName = Boolean(material.materialName && material.materialName.trim().length > 0);
  const quantityProduced = Number(material.quantityProduced);
  const hasQuantity = Number.isFinite(quantityProduced) && quantityProduced > 0;

    if (!hasSelection && !hasName && !hasQuantity) {
      continue;
    }

    if (!hasQuantity) {
      validationResult.valid = false;
      validationResult.errors.push(`Waste material ${index + 1}: quantity must be greater than 0`);
      continue;
    }

    if (!hasSelection && !hasName) {
      validationResult.valid = false;
      validationResult.errors.push(`Waste material ${index + 1}: please select an item or provide a name`);
      continue;
    }

    let sourceInventoryItem = null;
    if (hasSelection) {
      sourceInventoryItem = await Inventory.findById(material.inventoryItemId);
    }

    // If the referenced inventory item is missing, fall back to material name
    const wasteInventoryItem = await ensureWasteInventoryItem({
      baseItem: sourceInventoryItem,
      materialName: material.materialName || (sourceInventoryItem ? sourceInventoryItem.name : undefined),
      unit: material.unit || (sourceInventoryItem ? sourceInventoryItem.unit : undefined)
    });

    if (!wasteInventoryItem) {
      validationResult.valid = false;
      validationResult.errors.push(`Waste material ${index + 1}: unable to determine or create waste inventory item`);
      continue;
    }

    validationResult.processedMaterials.push({
      inventoryItemId: wasteInventoryItem._id,
      materialName: wasteInventoryItem.name,
      quantityProduced,
      unit: wasteInventoryItem.unit || material.unit || 'kg'
    });
  }

  return validationResult;
};

// Process inventory changes after mill production
const processInventoryChanges = async (rawMaterials, finishedProductItem, totalWeight, wasteMaterials, userId, dimension) => {
  try {
    // Consume raw materials
    for (const material of rawMaterials) {
      const inventoryItem = await Inventory.findById(material.inventoryItemId);
      if (inventoryItem) {
        const consumed = inventoryItem.consumeInventory(material.quantityUsed);
        if (consumed) {
          inventoryItem.lastUpdatedBy = userId;
          await inventoryItem.save();
        }
      }
    }

    // Add finished product to inventory (size-based for finished products)
    if (finishedProductItem.type === 'finished_product' && dimension) {
      // Find if the size already exists
      const existingSizeIndex = finishedProductItem.sizes.findIndex(
        (size) => size.dimension === dimension
      );

      if (existingSizeIndex !== -1) {
        // Size exists, add to its quantity
        finishedProductItem.sizes[existingSizeIndex].quantity += totalWeight;
        finishedProductItem.sizes[existingSizeIndex].availableQuantity += totalWeight;
      } else {
        // Size doesn't exist, create new size entry
        finishedProductItem.sizes.push({
          dimension: dimension,
          quantity: totalWeight,
          reservedQuantity: 0,
          availableQuantity: totalWeight
        });
      }

      // Also update the total quantity
      finishedProductItem.quantity += totalWeight;
      finishedProductItem.lastUpdatedBy = userId;
      await finishedProductItem.save();
    } else {
      // For non-finished products or if no dimension specified, use legacy method
      finishedProductItem.quantity += totalWeight;
      finishedProductItem.lastUpdatedBy = userId;
      await finishedProductItem.save();
    }

    // Add waste materials to inventory
    for (const waste of wasteMaterials) {
      const wasteItem = await Inventory.findById(waste.inventoryItemId);
      if (wasteItem) {
        wasteItem.quantity += waste.quantityProduced;
        wasteItem.lastUpdatedBy = userId;
        await wasteItem.save();
      }
    }

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
      status: { $in: ['available', 'low_stock'] },
      availableQuantity: { $gt: 0 },
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    })
    .select('_id name dimensions sku quantity availableQuantity unit')
    .sort({ name: 1 });

    res.json({
      message: 'Available raw materials retrieved',
      materials: rawMaterials
    });

  } catch (error) {
    console.error('Get available raw materials error:', error);
    res.status(500).json({ message: 'Server error fetching raw materials' });
  }
};

// Get available finished products for selection
const getAvailableFinishedProducts = async (req, res) => {
  try {
    const finishedProducts = await Inventory.find({
      type: 'finished_product',
      status: { $in: ['available', 'low_stock'] },
      availableQuantity: { $gt: 0 },
      // Exclude system-generated needed items
      sku: { $not: { $regex: '^NEEDED-', $options: 'i' } }
    })
    .select('_id name dimensions sku quantity availableQuantity unit')
    .sort({ name: 1 });

    res.json({
      message: 'Available finished products retrieved',
      products: finishedProducts
    });

  } catch (error) {
    console.error('Get available finished products error:', error);
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
      .populate('submittedBy', 'name alias')
      .populate('rawMaterials.inventoryItemId', 'name sku')
      .populate('finishedProduct.inventoryItemId', 'name sku quantity')
      .populate('wasteMaterials.inventoryItemId', 'name sku quantity')
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

// Edit hourly report (NEW)
const editHourlyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalProducts, rawMaterialsConsumed, wasteProducts, breakdowns, shift, operatorName, remarks } = req.body;

    const report = await MillHourlyReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Update editable fields
    if (breakdowns !== undefined) report.breakdowns = breakdowns;
    if (shift) report.shift = shift;
    if (operatorName !== undefined) report.operatorName = operatorName;
    if (remarks !== undefined) report.remarks = remarks;

    // Note: finalProducts, rawMaterialsConsumed, and wasteProducts can be edited
    // but inventory adjustments should be handled carefully
    if (finalProducts) report.finalProducts = finalProducts;
    if (rawMaterialsConsumed) report.rawMaterialsConsumed = rawMaterialsConsumed;
    if (wasteProducts) report.wasteProducts = wasteProducts;

    await report.save();
    await report.populate('createdBy', 'name alias');

    res.json({
      message: 'Hourly report updated',
      report
    });

  } catch (error) {
    console.error('Edit hourly report error:', error);
    res.status(500).json({ message: 'Server error updating report' });
  }
};

// Edit daily summary (NEW)
const editDailySummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { breakdownSummary, productionHours, efficiency, remarks } = req.body;

    const summary = await MillDailySummary.findById(id);
    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    if (summary.isSubmitted) {
      return res.status(400).json({ message: 'Submitted daily summary is locked and cannot be edited' });
    }

    // Update editable fields
    if (breakdownSummary !== undefined) summary.breakdownSummary = breakdownSummary;
    if (productionHours !== undefined) summary.productionHours = productionHours;
    if (efficiency !== undefined) summary.efficiency = efficiency;
    if (remarks !== undefined) summary.remarks = remarks;

    await summary.save();
    await summary.populate('createdBy', 'name alias');
    await summary.populate('submittedBy', 'name alias');

    res.json({
      message: 'Daily summary updated',
      summary
    });

  } catch (error) {
    console.error('Edit daily summary error:', error);
    res.status(500).json({ message: 'Server error updating summary' });
  }
};

const updateDailyElectricity = async (req, res) => {
  try {
    const { id } = req.params;
    const { startReading, endReading } = req.body;

    const summary = await MillDailySummary.findById(id);
    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    if (summary.isSubmitted) {
      return res.status(400).json({ message: 'Submitted daily summary is locked and cannot be updated' });
    }

    if (summary.electricity && Number.isFinite(summary.electricity.startReading) && Number.isFinite(summary.electricity.endReading)) {
      return res.status(400).json({ message: 'Electricity readings already captured for this day' });
    }

    const electricityPayload = buildElectricityPayload({ startReading, endReading }, req.user._id);
    if (electricityPayload.error) {
      return res.status(400).json({ message: electricityPayload.error });
    }

    summary.electricity = electricityPayload;
    await summary.save();

    res.status(200).json({
      message: 'Electricity readings captured',
      summary,
    });
  } catch (error) {
    console.error('Update daily electricity error:', error);
    res.status(500).json({ message: 'Server error updating electricity readings' });
  }
};

const submitDailySummary = async (req, res) => {
  try {
    const { id } = req.params;

    const summary = await MillDailySummary.findById(id);
    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    if (summary.isSubmitted) {
      return res.status(400).json({ message: 'Daily summary already submitted' });
    }

    summary.isSubmitted = true;
    summary.submittedAt = new Date();
    summary.submittedBy = req.user._id;
    await summary.save();
    await summary.populate('submittedBy', 'name alias role');

    res.status(200).json({
      message: 'Daily summary submitted and locked',
      summary,
    });
  } catch (error) {
    console.error('Submit daily summary error:', error);
    res.status(500).json({ message: 'Server error submitting daily summary' });
  }
};

module.exports = {
  createHourlyReport,
  createDailySummary,
  getAvailableRawMaterials,
  getAvailableFinishedProducts,
  stockTake,
  getHourlyReports,
  getDailySummaries,
  editHourlyReport,
  editDailySummary,
  updateDailyElectricity,
  submitDailySummary
};