# Inventory Dimensions Update

This update transforms the inventory system to support multiple dimensions per inventory item, with individual quantities and auto-generated SKUs for each dimension.

## Changes Made

### 1. Database Schema Changes

#### Before (Single Dimension)
```javascript
{
  sku: "STEEL-001",
  name: "Steel Rod",
  dimensions: "12mm", // Single string field
  quantity: 100,
  reservedQuantity: 10,
  availableQuantity: 90,
  minimumStock: 20
}
```

#### After (Multiple Dimensions)
```javascript
{
  sku: "STEEL-001", // Base SKU
  name: "Steel Rod",
  dimensions: [
    {
      _id: "...",
      dimension: "12mm",
      sku: "STEEL-001-12MM", // Auto-generated
      quantity: 100,
      bundles: 5,
      reservedQuantity: 10,
      availableQuantity: 90,
      minimumStock: 20,
      maxStock: 500,
      blockedOrders: []
    },
    {
      _id: "...",
      dimension: "16mm",
      sku: "STEEL-001-16MM", // Auto-generated
      quantity: 75,
      bundles: 3,
      reservedQuantity: 5,
      availableQuantity: 70,
      minimumStock: 15,
      maxStock: 300,
      blockedOrders: []
    }
  ]
}
```

### 2. Backend Changes

#### Model Updates (`src/models/Inventory.js`)
- Added `dimensionSchema` subdocument
- Removed single `dimensions`, `quantity`, `reservedQuantity`, etc. fields
- Added dimension-level stock management
- Auto-generates SKUs in format: `{baseSKU}-{DIMENSION}`
- Updated pre-save middleware for dimension-level calculations

#### Controller Updates (`src/controllers/inventoryController.js`)
- Updated `addInventoryItem` to handle dimension arrays
- Updated `updateInventoryItem` to work with specific dimensions
- Added `addDimensionToItem` method
- Added `getInventoryByDimensionSku` method
- Updated inventory reservation to be dimension-specific

#### Route Updates (`src/routes/inventoryRoutes.js`)
- Added `POST /:id/dimensions` for adding dimensions
- Added `GET /dimension/:dimensionSku` for dimension lookup

#### Validator Updates (`src/validators/inventoryValidators.js`)
- Updated schemas to support dimension arrays
- Added `addDimensionSchema` validator

### 3. Frontend Changes

#### Type Updates (`frontend/src/types/index.ts`)
- Added `InventoryDimension` interface
- Updated `InventoryItem` to use dimensions array
- Removed single dimension fields

#### New Components
- **`InventoryForm.tsx`**: Dynamic form with dimension management
- **`InventoryTable.tsx`**: Expandable table showing dimensions
- **`DimensionModal.tsx`**: Modal for adding/editing dimensions
- **`Inventory.tsx`**: Complete inventory management page

#### Updated Components
- **`InventoryDropdown.tsx`**: Now works with dimension SKUs

#### API Updates (`frontend/src/services/api.ts`)
- Updated inventory API methods for dimension support
- Added dimension-specific operations

## Key Features

### 1. Auto-Generated SKUs
- **Base SKU Auto-Generation**: If not provided, generates format: `{TYPE}-{NAME}-{COUNTER}`
  - Example: `FIN-STEELROD-001`, `RAW-IRONORE-002`, `STO-TOOLS-001`
- **Dimension SKUs**: Always auto-generated as `{baseSKU}-{dimensionSlug}`
  - Example: `FIN-STEELROD-001-12MM`, `FIN-STEELROD-001-16MM`
- **Custom Base SKU**: Users can still provide custom base SKUs if needed

### 2. Dimension-Level Stock Management
- Individual quantities per dimension
- Separate reserved/available quantities
- Dimension-specific minimum/maximum stock levels
- Bundle tracking per dimension

### 3. Enhanced UI
- Expandable inventory table
- Dynamic dimension forms
- Dimension-specific editing
- Auto-SKU preview in forms

### 4. Backward Compatibility
- Migration script provided
- Gradual rollout possible
- Data backup included

## Migration Guide

### Step 1: Backup Current Data
```bash
mongodump --db your-database-name --collection inventories
```

### Step 2: Run Migration Script
```bash
node migration-inventory-dimensions.js
```

### Step 3: Verify Migration
Check the `inventories_new` collection to ensure data looks correct.

### Step 4: Finalize Migration
```bash
node migration-inventory-dimensions.js finalize
```

### Step 5: Update Application
Deploy the updated backend and frontend code.

## API Changes

### Creating Inventory Items
```javascript
// Before
POST /api/inventory
{
  sku: "STEEL-001",
  name: "Steel Rod",
  dimensions: "12mm",
  quantity: 100
}

// After - with auto-generated SKU
POST /api/inventory
{
  // sku is optional - will auto-generate as "FIN-STEELROD-001"
  type: "finished_product",
  name: "Steel Rod",
  dimensions: [
    {
      dimension: "12mm",
      quantity: 100,
      bundles: 5,
      minimumStock: 20
    }
  ]
}

// After - with custom SKU
POST /api/inventory
{
  sku: "STEEL-001", // Custom SKU
  type: "finished_product",
  name: "Steel Rod",
  dimensions: [
    {
      dimension: "12mm",
      quantity: 100,
      bundles: 5,
      minimumStock: 20
    }
  ]
}
```

### Updating Inventory
```javascript
// Before
PATCH /api/inventory/:id
{
  quantity: 150,
  action: "set"
}

// After
PATCH /api/inventory/:id
{
  dimensionId: "dimension_id_here",
  quantity: 150,
  bundles: 7,
  action: "set"
}
```

### Adding Dimensions
```javascript
// New endpoint
POST /api/inventory/:id/dimensions
{
  dimension: "16mm",
  quantity: 75,
  bundles: 3,
  minimumStock: 15
}
```

### Inventory Dropdown Usage
```javascript
// Before
<InventoryDropdown
  value={selectedItemId}
  onChange={(item) => setSelectedItem(item)}
/>

// After
<InventoryDropdown
  value={selectedDimensionSku}
  onChange={(item, dimension) => {
    setSelectedItem(item);
    setSelectedDimension(dimension);
  }}
/>
```

## Benefits

1. **Granular Stock Control**: Track quantities at dimension level
2. **Better Organization**: Multiple sizes/variants under one product
3. **Improved SKU Management**: Auto-generated, consistent SKU format
4. **Enhanced Reporting**: Dimension-specific analytics
5. **Bundle Tracking**: Track bundles alongside quantities
6. **Flexible Stock Levels**: Different min/max per dimension

## Testing Checklist

- [ ] Create new inventory item with multiple dimensions (no SKU provided)
- [ ] Create new inventory item with custom SKU
- [ ] Verify auto-generated base SKUs follow correct format
- [ ] Verify dimension SKUs are auto-generated correctly
- [ ] Test SKU uniqueness and counter increment
- [ ] Edit dimension quantities (set, add, subtract)
- [ ] Add new dimension to existing item
- [ ] Test inventory dropdown with dimensions
- [ ] Verify stock status calculations
- [ ] Test order creation with dimension selection
- [ ] Verify reservation system works with dimensions
- [ ] Test low stock alerts per dimension
- [ ] Verify migration script with sample data

### Auto-SKU Generation Testing

Run the test script to verify auto-SKU generation:
```bash
node test-auto-sku.js
```

This will test:
1. Auto-generation of base SKU when not provided
2. Counter increment for duplicate names
3. Custom SKU handling
4. Dimension SKU auto-generation

## Rollback Plan

If issues arise:

1. Stop the application
2. Restore from backup:
   ```bash
   mongorestore --db your-database-name --collection inventories backup/
   ```
3. Deploy previous version of the application
4. Investigate and fix issues
5. Re-run migration after fixes

## Support

For questions or issues with this update, please check:
1. Migration logs for any errors
2. Database indexes are properly created
3. All required fields are populated
4. SKU uniqueness is maintained