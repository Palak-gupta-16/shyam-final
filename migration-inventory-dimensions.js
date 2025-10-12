const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shyam-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Old inventory schema (for reference)
const oldInventorySchema = new mongoose.Schema({
  sku: String,
  type: String,
  status: String,
  name: String,
  dimensions: String, // This was a single string field
  quantity: Number,
  unit: String,
  location: String,
  description: String,
  minimumStock: Number,
  maxStock: Number,
  reservedQuantity: Number,
  availableQuantity: Number,
  lastUpdatedBy: mongoose.Schema.Types.ObjectId,
  blockedOrders: Array
}, { timestamps: true });

const OldInventory = mongoose.model('OldInventory', oldInventorySchema, 'inventories');

// New inventory schema
const dimensionSchema = new mongoose.Schema({
  dimension: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  bundles: {
    type: Number,
    min: 0,
    default: 0
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  reservedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  minimumStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
  },
  blockedOrders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    quantityNeeded: {
      type: Number,
      min: 0
    },
    dateBlocked: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const newInventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['finished_product', 'raw_material', 'store_item'],
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'needed', 'low_stock', 'out_of_stock', 'blocked'],
    default: 'available'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dimensions: [dimensionSchema],
  length: {
    type: Number,
    trim: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'pieces'
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const NewInventory = mongoose.model('NewInventory', newInventorySchema, 'inventories_new');

async function migrateInventory() {
  try {
    console.log('Starting inventory migration...');
    
    // Get all old inventory items
    const oldItems = await OldInventory.find({});
    console.log(`Found ${oldItems.length} items to migrate`);
    
    const migratedItems = [];
    
    for (const oldItem of oldItems) {
      try {
        // Create dimension from old data
        const dimensionName = oldItem.dimensions || 'Standard';
        const dimensionSlug = dimensionName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const dimensionSku = `${oldItem.sku}-${dimensionSlug}`;
        
        const newItem = {
          sku: oldItem.sku,
          type: oldItem.type,
          status: oldItem.status,
          name: oldItem.name,
          dimensions: [{
            dimension: dimensionName,
            quantity: oldItem.quantity || 0,
            bundles: 0, // Default value
            sku: dimensionSku,
            reservedQuantity: oldItem.reservedQuantity || 0,
            availableQuantity: oldItem.availableQuantity || 0,
            minimumStock: oldItem.minimumStock || 0,
            maxStock: oldItem.maxStock,
            blockedOrders: oldItem.blockedOrders || []
          }],
          length: oldItem.length,
          unit: oldItem.unit,
          location: oldItem.location,
          description: oldItem.description,
          lastUpdatedBy: oldItem.lastUpdatedBy,
          createdAt: oldItem.createdAt,
          updatedAt: oldItem.updatedAt
        };
        
        migratedItems.push(newItem);
        console.log(`Prepared migration for: ${oldItem.name} (${oldItem.sku})`);
        
      } catch (error) {
        console.error(`Error preparing migration for item ${oldItem.sku}:`, error.message);
      }
    }
    
    if (migratedItems.length > 0) {
      // Insert migrated items into new collection
      await NewInventory.insertMany(migratedItems);
      console.log(`Successfully migrated ${migratedItems.length} items`);
      
      // Optional: Backup old collection and replace
      console.log('\nMigration completed successfully!');
      console.log('Next steps:');
      console.log('1. Verify the migrated data in the "inventories_new" collection');
      console.log('2. If everything looks good, rename collections:');
      console.log('   - Rename "inventories" to "inventories_backup"');
      console.log('   - Rename "inventories_new" to "inventories"');
      console.log('3. Update any references in your application');
      
    } else {
      console.log('No items to migrate');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Helper function to finalize migration (run after verification)
async function finalizeMigration() {
  try {
    console.log('Finalizing migration...');
    
    // Rename collections
    await mongoose.connection.db.collection('inventories').rename('inventories_backup');
    await mongoose.connection.db.collection('inventories_new').rename('inventories');
    
    console.log('Migration finalized successfully!');
    console.log('Old data is backed up in "inventories_backup" collection');
    
  } catch (error) {
    console.error('Error finalizing migration:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'finalize') {
    finalizeMigration();
  } else {
    migrateInventory();
  }
}

module.exports = { migrateInventory, finalizeMigration };