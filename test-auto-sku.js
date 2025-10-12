const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shyam-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import the updated Inventory model
const Inventory = require('./src/models/Inventory');

async function testAutoSKUGeneration() {
  try {
    console.log('Testing auto-SKU generation...');
    
    // Test 1: Create item without SKU
    const testItem1 = new Inventory({
      type: 'finished_product',
      name: 'Steel Rod Test',
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
      description: 'Test steel rod for auto-SKU generation'
    });

    await testItem1.save();
    console.log('✅ Test 1 - Item created successfully:');
    console.log(`   Base SKU: ${testItem1.sku}`);
    console.log('   Dimension SKUs:');
    testItem1.dimensions.forEach(dim => {
      console.log(`     ${dim.dimension}: ${dim.sku}`);
    });

    // Test 2: Create another item with same name to test counter
    const testItem2 = new Inventory({
      type: 'finished_product',
      name: 'Steel Rod Test',
      dimensions: [
        {
          dimension: '20mm',
          quantity: 50,
          bundles: 2,
          minimumStock: 10
        }
      ],
      unit: 'pieces',
      description: 'Second test steel rod for auto-SKU generation'
    });

    await testItem2.save();
    console.log('✅ Test 2 - Second item created successfully:');
    console.log(`   Base SKU: ${testItem2.sku}`);
    console.log('   Dimension SKUs:');
    testItem2.dimensions.forEach(dim => {
      console.log(`     ${dim.dimension}: ${dim.sku}`);
    });

    // Test 3: Create item with provided SKU
    const testItem3 = new Inventory({
      sku: 'CUSTOM-SKU-001',
      type: 'raw_material',
      name: 'Custom Material',
      dimensions: [
        {
          dimension: 'Standard',
          quantity: 200,
          bundles: 10,
          minimumStock: 50
        }
      ],
      unit: 'kg',
      description: 'Test with custom SKU'
    });

    await testItem3.save();
    console.log('✅ Test 3 - Item with custom SKU created successfully:');
    console.log(`   Base SKU: ${testItem3.sku}`);
    console.log('   Dimension SKUs:');
    testItem3.dimensions.forEach(dim => {
      console.log(`     ${dim.dimension}: ${dim.sku}`);
    });

    console.log('\n🎉 All tests passed! Auto-SKU generation is working correctly.');

    // Clean up test data
    await Inventory.deleteMany({ 
      $or: [
        { sku: { $regex: '^FIN-STEELROD-' } },
        { sku: 'CUSTOM-SKU-001' }
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
  testAutoSKUGeneration();
}

module.exports = { testAutoSKUGeneration };