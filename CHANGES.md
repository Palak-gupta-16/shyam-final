# SHYAM SUPER APP - Recent Updates and Changes

## Overview of Changes Made
This document outlines all the major changes implemented in the system based on the new requirements.

---

## 1. ORDER MANAGEMENT CHANGES

### 1.1 Vehicle Details Separation
**Previous Flow:** Vehicle details were required when creating an order.
**New Flow:** Orders are created WITHOUT vehicle details. Vehicle details are added later via a separate endpoint.

#### Backend Changes:
- **Model:** `src/models/Order.js` - Vehicle fields are now optional (not required)
- **Controller:** Added `addVehicleDetails()` method in `src/controllers/orderController.js`
- **Route:** `PATCH /api/orders/:id/vehicle-details` - New endpoint to add vehicle details

#### API Usage:
```javascript
// 1. Create order WITHOUT vehicle details
POST /api/orders
{
  "type": "dispatch",
  "customerOrSupplier": "ABC Company",
  "products": [...]
}

// 2. Add vehicle details later
PATCH /api/orders/:orderId/vehicle-details
{
  "vehicle": {
    "number": "MH-12-AB-1234",
    "driverName": "John Doe",
    "driverNumber": "9876543210"
  }
}
```

### 1.2 Dispatch Button & Product Availability
- System checks if products are available when order is created
- If products available: Shows "Dispatch" option
- If products NOT available: Shows message "X products needed" with exact shortfall

### 1.3 Enhanced Loading Flow with Bundle Tracking
**New Feature:** During loading, system now tracks individual bundles with size and weight

#### Backend Changes:
- **Controller:** Enhanced `loadingComplete()` in `src/controllers/orderController.js`
- Each bundle now tracks: bundleNumber, weight, size, length
- Inventory is deducted based on exact loaded quantities

#### API Usage:
```javascript
POST /api/orders/:id/loading-complete
{
  "productLoads": [
    {
      "productIndex": 0,
      "bundles": 50,
      "bundleDetails": [
        {
          "bundleNumber": 1,
          "weight": 125.5,
          "size": "10mm",
          "length": 12
        },
        ...
      ]
    }
  ],
  "totalLoadedWeight": 6275,
  "notes": "All bundles checked"
}
```

### 1.4 Fare Management in Accounting
**New Feature:** Track transportation fare with who pays (our side or other party)

#### Backend Changes:
- **Model:** Added `fare` object in Order invoice
- **Controller:** Added `updateFareDetails()` method
- **Route:** `PATCH /api/orders/:id/fare-details`

#### API Usage:
```javascript
PATCH /api/orders/:id/fare-details
{
  "fareAmount": 5000,
  "paidBy": "our_side", // or "other_party"
  "fareNotes": "Round trip included"
}
```

### 1.5 Order Edit Functionality
**New Feature:** Orders can be edited before guard approval

#### Backend Changes:
- **Controller:** Added `updateOrder()` method
- **Route:** `PATCH /api/orders/:id`

---

## 2. INVENTORY MANAGEMENT CHANGES

### 2.1 Removed SKU Requirement
**Previous:** SKU was mandatory and unique
**New:** SKU field removed entirely, items identified by name and type

#### Backend Changes:
- **Model:** `src/models/Inventory.js` - Removed SKU field
- **Controller:** Updated all inventory methods to remove SKU handling

### 2.2 Multiple Sizes for Finished Products
**New Feature:** Finished products can have multiple sizes with individual quantities

#### Backend Changes:
- **Model:** Added `sizes` array to Inventory schema
```javascript
sizes: [{
  dimension: String,  // e.g., "10mm", "12mm"
  quantity: Number,
  reservedQuantity: Number,
  availableQuantity: Number
}]
```

- **Controller:** Added `addSizeToFinishedProduct()` method
- **Route:** `POST /api/inventory/:id/add-size`

#### API Usage:
```javascript
// Create finished product with multiple sizes
POST /api/inventory
{
  "type": "finished_product",
  "name": "Steel Bar",
  "sizes": [
    { "dimension": "10mm", "quantity": 1000 },
    { "dimension": "12mm", "quantity": 800 },
    { "dimension": "16mm", "quantity": 500 }
  ],
  "unit": "pieces"
}

// Add size to existing product
POST /api/inventory/:id/add-size
{
  "dimension": "20mm",
  "quantity": 300
}
```

### 2.3 Size Mandatory Only for Finished Products
- Size/dimensions required ONLY for finished products
- Other inventory types (raw material, store items, waste) don't require size

### 2.4 Inventory Edit Functionality
**New Feature:** Complete edit capability for inventory items

#### Backend Changes:
- **Controller:** Added `editInventoryItem()` method
- **Route:** `PUT /api/inventory/:id`

---

## 3. MILL REPORT CHANGES

### 3.1 Removed Billet Size & Miss Rolls
**Previous:** Reports tracked billetSize and missRolls
**New:** Replaced with categorized product tracking

#### Backend Changes:
- **Model:** `src/models/MillHourlyReport.js` - Complete restructure

### 3.2 New Report Structure with Categories
**New Structure:** Reports now track three categories:

1. **Final Products** (what was produced)
2. **Raw Materials Consumed** (what was used)
3. **Waste Products** (what waste was generated)

#### Backend Changes:
```javascript
// New Mill Hourly Report Schema
{
  finalProducts: [{
    productId: ObjectId,      // From inventory (finished_product)
    productName: String,
    dimension: String,
    quantity: Number
  }],
  rawMaterialsConsumed: [{
    materialId: ObjectId,     // From inventory (raw_material)
    materialName: String,
    quantity: Number,
    unit: String
  }],
  wasteProducts: [{
    wasteId: ObjectId,        // From inventory (waste_material)
    wasteName: String,
    quantity: Number,
    unit: String
  }]
}
```

#### API Usage:
```javascript
POST /api/mill/hourly
{
  "date": "2026-01-14",
  "hour": 14,
  "finalProducts": [
    {
      "productId": "inventory_id_here",
      "dimension": "10mm",
      "quantity": 500
    }
  ],
  "rawMaterialsConsumed": [
    {
      "materialId": "inventory_id_here",
      "quantity": 1000,
      "unit": "kg"
    }
  ],
  "wasteProducts": [
    {
      "wasteId": "inventory_id_here",
      "quantity": 50,
      "unit": "kg"
    }
  ],
  "shift": "A",
  "operatorName": "John"
}
```

### 3.3 Automatic Inventory Updates
- Final products: Quantity ADDED to inventory
- Raw materials: Quantity SUBTRACTED from inventory
- Waste products: Quantity ADDED to inventory (waste_material type)

### 3.4 Mill Report Edit Functionality
**New Feature:** Reports can be edited after creation

#### Backend Changes:
- **Controller:** Added `editHourlyReport()` and `editDailySummary()` methods
- **Routes:** 
  - `PUT /api/mill/hourly/:id`
  - `PUT /api/mill/daily/:id`

---

## 4. NEW API ENDPOINTS SUMMARY

### Order Endpoints:
- `PATCH /api/orders/:id/vehicle-details` - Add vehicle details to order
- `PATCH /api/orders/:id/fare-details` - Update fare information
- `PATCH /api/orders/:id` - Edit order (before guard approval)

### Inventory Endpoints:
- `PUT /api/inventory/:id` - Edit full inventory item
- `POST /api/inventory/:id/add-size` - Add size to finished product

### Mill Endpoints:
- `PUT /api/mill/hourly/:id` - Edit hourly report
- `PUT /api/mill/daily/:id` - Edit daily summary

---

## 5. WORKFLOW CHANGES

### Complete Dispatch Order Flow:
1. **Create Order** - Customer name, products, quantities (NO vehicle details)
2. **Show Product Availability** - "Dispatch ready" or "Need X products"
3. **Add Vehicle Details** - After order confirmation
4. **Guard Approval** - Vehicle enters factory
5. **Empty Weight** - Weighbridge records tare weight
6. **Loading** - Track each bundle (size, weight)
   - Inventory automatically deducted based on loaded bundles
7. **Final Weight** - Weighbridge records gross weight
8. **Accounting** - Add fare details + generate invoice
9. **Guard Exit** - Vehicle leaves factory
10. **Completed**

### Complete Purchase Order Flow:
1. **Create Order** - Supplier name, materials, quantities (NO vehicle details)
2. **Add Vehicle Details** - After order confirmation
3. **Guard Approval** - Vehicle enters factory
4. **Empty Weight** - Weighbridge records tare weight
5. **Unloading** - Materials unloaded
   - Inventory automatically added
6. **Final Weight** - Weighbridge records gross weight
7. **Accounting** - Add fare details + generate invoice
8. **Guard Exit** - Vehicle leaves factory
9. **Completed**

---

## 6. ACCOUNTS PAGE ENHANCEMENTS

### New Features:
1. **Fare Tracking Table** - Shows all orders with fare details
   - Fare amount
   - Who paid (our side / other party)
   - Order details

2. **Order Summary** - View all orders with financial details
   - Invoice amounts
   - Fare costs
   - Net amounts

---

## 7. FRONTEND CHANGES REQUIRED

### Pages to Update:
1. **Orders Page** (`frontend/src/pages/Orders.tsx`)
   - Separate order creation (no vehicle)
   - Add vehicle details button/modal
   - Show product availability status

2. **Accounts Page** (`frontend/src/pages/Accounts.tsx`)
   - Add fare management UI
   - Display fare table
   - Show order financial summary

3. **Inventory Page** (`frontend/src/pages/Inventory.tsx`)
   - Remove SKU field
   - Add multiple sizes support for finished products
   - Add size management UI
   - Edit inventory functionality

4. **Mill Reports Page** (`frontend/src/pages/MillReports.tsx`)
   - Remove billet size and miss rolls fields
   - Add three dropdown categories:
     - Final Products (from finished_product inventory)
     - Raw Materials (from raw_material inventory)
     - Waste Products (from waste_material inventory)
   - Edit report functionality

5. **Loading Page** (`frontend/src/pages/LoadingTeam.tsx`)
   - Enhanced bundle tracking form
   - Size and weight input for each bundle
   - Summary calculations

---

## 8. KEY BENEFITS

1. **Flexibility** - Order creation without vehicle commitment
2. **Accuracy** - Bundle-level tracking for precise inventory
3. **Transparency** - Clear fare tracking and financial visibility
4. **Categorization** - Proper segregation of products in mill reports
5. **Editability** - Ability to correct mistakes in orders, inventory, and reports
6. **Scalability** - Multiple sizes support for products

---

## 9. TESTING CHECKLIST

- [ ] Create dispatch order without vehicle
- [ ] Add vehicle details to existing order
- [ ] Create order with insufficient inventory
- [ ] Complete loading with bundle tracking
- [ ] Add fare details in accounts
- [ ] Create finished product with multiple sizes
- [ ] Add size to existing product
- [ ] Create mill report with categorized products
- [ ] Edit order, inventory, and reports
- [ ] Verify inventory updates on mill reports

---

## 10. MIGRATION NOTES

If you have existing data:
1. Existing orders will continue to work (vehicle field is optional)
2. Existing inventory items without sizes will work (sizes array is optional)
3. Old mill reports will remain accessible (new schema is additive)
4. Consider running a data migration script to:
   - Add empty sizes array to finished products
   - Initialize fare objects in orders

---

## Support

For any issues or questions regarding these changes, please contact the development team or refer to the API documentation in the README.md file.
