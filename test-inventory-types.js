const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shyam-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import the updated Inventory model
const Inventory = require('./src/models/Inventory');

async function testInventoryTypes() {
  try {
    console.log('Testing inventory types...');
    
    // Test 1: Create finished product with dimensions
    console.log('\n1. Testing Finished Product with Dimensions:');
    const finishedProduct = new Inventory({
      type: 'finished_product',
      name: 'Steel Rod',
      dimensions: [
        {
          dimension: '12mm',
          quantity: 100,
          bundles: 5,
          minimumStock: 20
        },
        {
          dimension: '16mm',
          quantity: 75,
          bundles: 3,
          minimumStock: 15
        }
      ],
      unit: 'pieces',
      description: 'High quality steel rods'
    });

    await finishedProduct.save();
    console.log(`✅ Finished Product created:`);
    console.log(`   Base SKU: ${finishedProduct.sku}`);
    console.log(`   Status: ${finishedProduct.status}`);
    console.log('   Dimensions:');
    finishedProduct.dimensions.forEach(dim => {
      console.log(`     ${dim.dimension}: ${dim.sku} (Qty: ${dim.quantity}, Available: ${dim.availableQuantity})`);
    });

    // Test 2: Create raw material with simple quantity
    console.log('\n2. Testing Raw Material with Simple Quantity:');
    const rawMaterial = new Inventory({
      type: 'raw_material',
      name: 'Iron Ore',
      quantity: 500,
      bundles: 10,
      minimumStock: 100,
      maxStock: 1000,
      unit: 'kg',
      description: 'High grade iron ore'
    });

    await rawMaterial.save();
    console.log(`✅ Raw Material created:`);
    console.log(`   Base SKU: ${rawMaterial.sku}`);
    console.log(`   Status: ${rawMaterial.status}`);
    console.log(`   Quantity: ${rawMaterial.quantity} ${rawMaterial.unit}`);
    console.log(`   Available: ${rawMaterial.availableQuantity} ${rawMaterial.unit}`);
    console.log(`   Bundles: ${rawMaterial.bundles}`);

    // Test 3: Create store item with simple quantity
    console.log('\n3. Testing Store Item with Simple Quantity:');
    const storeItem = new Inventory({
      type: 'store_item',
      name: 'Safety Helmet',
      quantity: 25,
      minimumStock: 5,
      unit: 'pieces',
      description: 'Safety helmets for workers'
    });

    await storeItem.save();
    console.log(`✅ Store Item created:`);
    console.log(`   Base SKU: ${storeItem.sku}`);
    console.log(`   Status: ${storeItem.status}`);
    console.log(`   Quantity: ${storeItem.quantity} ${storeItem.unit}`);
    console.log(`   Available: ${storeItem.availableQuantity} ${storeItem.unit}`);

    // Test 4: Test status calculations
    console.log('\n4. Testing Status Calculations:');
    
    // Set a dimension to low stock
    finishedProduct.dimensions[0].quantity = 10; // Below minimum stock of 20
    await finishedProduct.save();
    console.log(`✅ Finished Product status after low stock: ${finishedProduct.status}`);
    
    // Set raw material to out of stock
    rawMaterial.quantity = 0;
    await rawMaterial.save();
    console.log(`✅ Raw Material status after out of stock: ${rawMaterial.status}`);

    console.log('\n🎉 All inventory type tests passed!');

    // Clean up test data
    await Inventory.deleteMany({ 
      $or: [
        { sku: { $regex: '^FIN-STEELROD-' } },
        { sku: { $regex: '^RAW-IRONORE-' } },
        { sku: { $regex: '^STO-SAFETYHE-' } }
      ]
    });
    console.log('🧹 Test data cleaned up.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
if (require.main === module) {
  testInventoryTypes();
}

module.exports = { testInventoryTypes };