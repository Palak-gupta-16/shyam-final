const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('./src/models/Inventory');

async function addTestInventory() {
  try {
    console.log('🧪 Adding Test Inventory Items\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    const timestamp = Date.now();
    const userId = new mongoose.Types.ObjectId();

    // Add raw materials
    console.log('\n📦 Adding raw materials...');
    const rawMaterials = [
      {
        name: 'Iron Billet 150x150',
        type: 'raw_material',
        sku: `IRON-BILLET-150-${timestamp}`,
        unit: 'mt',
        quantity: 10,
        availableQuantity: 8,
        status: 'available',
        createdBy: userId
      },
      {
        name: 'Steel Scrap',
        type: 'raw_material',
        sku: `STEEL-SCRAP-${timestamp}`,
        unit: 'mt',
        quantity: 5,
        availableQuantity: 5,
        status: 'available',
        createdBy: userId
      },
      {
        name: 'Iron Ore',
        type: 'raw_material',
        sku: `IRON-ORE-${timestamp}`,
        unit: 'mt',
        quantity: 0,
        availableQuantity: 0,
        status: 'out_of_stock',
        createdBy: userId
      }
    ];

    for (const material of rawMaterials) {
      const item = new Inventory(material);
      await item.save();
      console.log(`✅ Added raw material: ${material.name} (${material.status})`);
    }

    // Add finished products
    console.log('\n🏭 Adding finished products...');
    const finishedProducts = [
      {
        name: 'Steel Rebar TMT',
        type: 'finished_product',
        sku: `STEEL-REBAR-TMT-${timestamp}`,
        unit: 'mt',
        quantity: 0,
        availableQuantity: 0,
        status: 'available',
        dimensions: [
          { 
            dimension: '8mm x 12m', 
            quantity: 2, 
            bundles: 10, 
            availableQuantity: 2, 
            sku: `STEEL-REBAR-TMT-${timestamp}-8MM12M` 
          },
          { 
            dimension: '10mm x 12m', 
            quantity: 1.5, 
            bundles: 8, 
            availableQuantity: 1.5, 
            sku: `STEEL-REBAR-TMT-${timestamp}-10MM12M` 
          },
          { 
            dimension: '12mm x 12m', 
            quantity: 0, 
            bundles: 0, 
            availableQuantity: 0, 
            sku: `STEEL-REBAR-TMT-${timestamp}-12MM12M` 
          }
        ],
        createdBy: userId
      },
      {
        name: 'Steel Angle',
        type: 'finished_product',
        sku: `STEEL-ANGLE-${timestamp}`,
        unit: 'mt',
        quantity: 0,
        availableQuantity: 0,
        status: 'needed',
        dimensions: [
          { 
            dimension: '25x25x3mm', 
            quantity: 0, 
            bundles: 0, 
            availableQuantity: 0, 
            sku: `STEEL-ANGLE-${timestamp}-25X25X3` 
          },
          { 
            dimension: '40x40x5mm', 
            quantity: 0, 
            bundles: 0, 
            availableQuantity: 0, 
            sku: `STEEL-ANGLE-${timestamp}-40X40X5` 
          }
        ],
        createdBy: userId
      }
    ];

    for (const product of finishedProducts) {
      const item = new Inventory(product);
      await item.save();
      console.log(`✅ Added finished product: ${product.name} (${product.status})`);
      console.log(`   Dimensions: ${product.dimensions.map(d => d.dimension).join(', ')}`);
    }

    console.log('\n🎉 Test inventory items added successfully!');
    console.log('\nSummary:');
    console.log(`- Raw materials: ${rawMaterials.length}`);
    console.log(`- Finished products: ${finishedProducts.length}`);

  } catch (error) {
    console.error('❌ Failed to add test inventory:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
addTestInventory();