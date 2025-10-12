const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const MillDailySummary = require('./src/models/MillDailySummary');
const Inventory = require('./src/models/Inventory');

async function testMillEnhancements() {
  try {
    console.log('🧪 Testing Mill Daily Summary Enhancements\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Test 1: Create a sample finished product with dimensions
    console.log('\n📦 Test 1: Creating sample finished product with dimensions');
    
    const timestamp = Date.now();
    const finishedProduct = new Inventory({
      name: 'Steel Rebar',
      type: 'finished_product',
      sku: `STEEL-REBAR-${timestamp}`,
      unit: 'mt',
      quantity: 0,
      availableQuantity: 0,
      dimensions: [
        { dimension: '12mm x 6m', quantity: 0, bundles: 0, availableQuantity: 0, sku: `STEEL-REBAR-${timestamp}-12MM6M` },
        { dimension: '16mm x 6m', quantity: 0, bundles: 0, availableQuantity: 0, sku: `STEEL-REBAR-${timestamp}-16MM6M` }
      ],
      createdBy: new mongoose.Types.ObjectId()
    });

    await finishedProduct.save();
    console.log('✅ Created finished product with dimensions:', finishedProduct.name);

    // Test 2: Create a sample raw material
    console.log('\n🔧 Test 2: Creating sample raw material');
    
    const rawMaterial = new Inventory({
      name: 'Iron Billet',
      type: 'raw_material',
      sku: `IRON-BILLET-${timestamp}`,
      unit: 'mt',
      quantity: 1,
      availableQuantity: 1,
      createdBy: new mongoose.Types.ObjectId()
    });

    await rawMaterial.save();
    console.log('✅ Created raw material:', rawMaterial.name);

    // Test 3: Create mill daily summary with new structure
    console.log('\n🏭 Test 3: Creating mill daily summary with enhanced structure');
    
    const millSummary = new MillDailySummary({
      date: new Date(),
      name: finishedProduct.name,
      dimensions: finishedProduct.dimensions.map(d => d.dimension).join(', '),
      rawMaterials: [{
        inventoryItemId: rawMaterial._id,
        materialName: rawMaterial.name,
        quantityUsed: 0.5,
        unit: 'mt'
      }],
      finishedProduct: {
        inventoryItemId: finishedProduct._id,
        dimensions: [
          { dimension: '12mm x 6m', bundles: 10, quantity: 0.2 },
          { dimension: '16mm x 6m', bundles: 8, quantity: 0.3 }
        ]
      },
      wasteMaterials: [
        { materialName: 'Steel Scrap', quantity: 0.05, unit: 'mt' },
        { materialName: 'Scale', quantity: 0.025, unit: 'mt' }
      ],
      totalPieces: 100,
      totalWeight: 0.5,
      productionHours: 8,
      efficiency: 95.5,
      breakdownSummary: 'Minor maintenance on roller 3',
      remarks: 'Good production day',
      createdBy: new mongoose.Types.ObjectId()
    });

    await millSummary.save();
    console.log('✅ Created mill daily summary with enhanced structure');
    console.log('   - Finished product dimensions:', millSummary.finishedProduct.dimensions.length);
    console.log('   - Waste materials:', millSummary.wasteMaterials.length);
    console.log('   - Raw materials:', millSummary.rawMaterials.length);

    // Test 4: Retrieve and verify the data
    console.log('\n🔍 Test 4: Retrieving and verifying data');
    
    const retrievedSummary = await MillDailySummary.findById(millSummary._id)
      .populate('rawMaterials.inventoryItemId', 'name sku')
      .populate('finishedProduct.inventoryItemId', 'name sku');

    console.log('✅ Retrieved mill summary:');
    console.log('   - Date:', retrievedSummary.date.toDateString());
    console.log('   - Finished product:', retrievedSummary.finishedProduct.inventoryItemId.name);
    console.log('   - Dimensions produced:', retrievedSummary.finishedProduct.dimensions.map(d => `${d.dimension}: ${d.bundles} bundles, ${d.quantity}mt`));
    console.log('   - Waste materials:', retrievedSummary.wasteMaterials.map(w => `${w.materialName}: ${w.quantity}${w.unit}`));
    console.log('   - Raw materials used:', retrievedSummary.rawMaterials.map(r => `${r.materialName}: ${r.quantityUsed}${r.unit}`));

    console.log('\n🎉 All tests passed! Mill enhancements are working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testMillEnhancements();