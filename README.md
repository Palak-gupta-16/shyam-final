# SHYAM SUPER APP Backend

A comprehensive backend system for factory operations management, built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Order Management**: Complete order lifecycle management for dispatch and purchase orders
- **Inventory Management**: Track finished products, raw materials, store items, and yard stock
- **Gate Pass System**: Manage vehicle entry/exit requests
- **Mill Operations**: Record hourly and daily production reports
- **Store Issuance**: Track issuance and return of store items
- **Activity Logging**: Comprehensive audit trails for all user actions
- **File Upload Support**: Handle slip PDFs, invoices, and other documents

## Project Structure

```
├── server.js                 # Entry point
├── package.json              # Dependencies and scripts
├── env.example               # Environment variables template
├── uploads/                  # File uploads directory
└── src/
    ├── config/
    │   └── db.js             # Database configuration
    ├── models/               # Mongoose schemas
    │   ├── User.js
    │   ├── Order.js
    │   ├── Inventory.js
    │   ├── GatePass.js
    │   ├── MillHourlyReport.js
    │   ├── MillDailySummary.js
    │   ├── StoreIssuance.js
    │   ├── ActivityLog.js
    │   └── index.js
    ├── controllers/          # Business logic
    │   ├── authController.js
    │   ├── orderController.js
    │   ├── inventoryController.js
    │   ├── gatePassController.js
    │   ├── millController.js
    │   ├── storeController.js
    │   └── index.js
    ├── routes/               # API routes
    │   ├── authRoutes.js
    │   ├── orderRoutes.js
    │   ├── inventoryRoutes.js
    │   ├── gatePassRoutes.js
    │   ├── millRoutes.js
    │   ├── storeRoutes.js
    │   └── index.js
    ├── middlewares/          # Custom middleware
    │   ├── auth.js
    │   ├── activityLogger.js
    │   ├── validation.js
    │   └── index.js
    ├── validators/           # Joi validation schemas
    │   ├── authValidators.js
    │   ├── orderValidators.js
    │   ├── inventoryValidators.js
    │   └── index.js
    └── utils/                # Utility functions
        ├── counter.js        # Sequential ID generation
        └── stateMachine.js   # Order state management
```

## Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/shyam-super-app
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   PORT=4000
   ```

3. **Start MongoDB**
   Ensure MongoDB is running on your system.

4. **Run the Application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication
All endpoints (except login) require JWT authentication:
```
Authorization: Bearer <token>
```

### Main Endpoints

#### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - Register new user (requires admin role for privileged roles)
- `GET /profile` - Get current user profile

#### Orders (`/api/orders`)
- `POST /` - Create new order
- `PATCH /:id/guard-approve` - Guard approve vehicle entry
- `POST /:id/weight/empty` - Record empty weight
- `PATCH /:id/ready-loading` - Signal ready for loading
- `PATCH /:id/accept-loading` - Accept order for loading
- `POST /:id/loading-complete` - Complete loading process
- `POST /:id/weight/final` - Record final weight
- `POST /:id/generate-invoice` - Generate invoice
- `PATCH /:id/exit` - Mark vehicle as exited
- `GET /` - Get orders with filters

#### Inventory (`/api/inventory`)
- `GET /` - Get all inventory items
- `POST /` - Add new inventory item
- `PATCH /:id` - Update inventory quantity
- `GET /type/:type` - Get inventory by type
- `GET /low-stock` - Get low stock items
- `GET /search` - Search inventory

#### Gate Passes (`/api/gatepasses`)
- `POST /` - Create gate pass request
- `PATCH /:id/approve` - Approve gate pass
- `PATCH /:id/reject` - Reject gate pass
- `GET /` - Get gate passes with filters
- `GET /:id` - Get gate pass by ID
- `GET /status/pending` - Get pending gate passes

#### Mill Operations (`/api/mill`)
- `POST /hourly` - Create hourly report
- `POST /daily` - Create daily summary
- `POST /stock-take` - Increment finished product inventory
- `GET /hourly` - Get hourly reports
- `GET /daily` - Get daily summaries
- `GET /stats` - Get production statistics

#### Store Issuance (`/api/store`)
- `POST /issue` - Issue store item
- `PATCH /return/:id` - Return store item
- `GET /issuances` - Get store issuances
- `GET /pending-returns` - Get pending returns
- `GET /issuances/:id` - Get issuance by ID
- `GET /stats` - Get issuance statistics

#### File Upload
- `POST /api/upload` - Upload files (slips, invoices, etc.)

## User Roles

- **Guard**: Vehicle entry/exit, gate pass management
- **Weighbridge**: Weight recording operations
- **Loading**: Loading operations management
- **Unloading**: Unloading operations (future feature)
- **Mill_Supervisor**: Mill reports and stock-take
- **Accounting**: Invoice generation
- **Stocks**: Stock management (future feature)
- **General_Manager**: Broad access across modules
- **Director**: Broad access across modules
- **Store_Keeper**: Inventory and store management
- **Purchasing**: Purchase order creation

## Order Lifecycle

### Dispatch Flow
1. `pending_guard_approval`
2. `inside_factory_pending_empty_weight`
3. `inside_factory_pending_loading`
4. `inside_factory_pending_final_weight`
5. `ready_for_billing`
6. `ready_for_dispatch`
7. `completed`

### Purchase Flow
1. `pending_guard_approval`
2. `inside_factory_pending_empty_weight_purchase`
3. `inside_factory_pending_unloading`
4. `inside_factory_pending_unloaded`
5. `inside_factory_pending_final_weight_purchase`
6. `ready_for_billing_purchase`
7. `ready_for_exit_purchase`
8. `completed`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions by user role
- **Input Validation**: Joi schemas for request validation
- **Activity Logging**: Comprehensive audit trails
- **Password Hashing**: Bcrypt for secure password storage
- **File Upload Security**: Type and size restrictions

## Development

### Scripts
```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
```

### Adding New Features
1. Create/update models in `src/models/`
2. Add business logic in `src/controllers/`
3. Define routes in `src/routes/`
4. Add validation schemas in `src/validators/`
5. Update documentation

## Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use secure JWT secret
   - Configure production MongoDB URI
   - Set up proper CORS origins

2. **Security Recommendations**
   - Implement rate limiting
   - Use HTTPS
   - Set up proper logging
   - Configure firewalls
   - Regular security audits

3. **Monitoring**
   - Set up application monitoring
   - Database performance monitoring
   - Error tracking and alerting

## License

Private - SHYAM SUPER APP

## Support

For technical support or questions, please contact the development team.
