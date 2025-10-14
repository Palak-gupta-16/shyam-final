const express = require('express');
const authRoutes = require('./authRoutes');
const orderRoutes = require('./orderRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const neededItemsRoutes = require('./neededItemsRoutes');
const gatePassRoutes = require('./gatePassRoutes');
const millRoutes = require('./millRoutes');
const storeRoutes = require('./storeRoutes');
const fareRoutes = require('./fareRoutes');

const router = express.Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/needed-items', neededItemsRoutes);
router.use('/gatepasses', gatePassRoutes);
router.use('/mill', millRoutes);
router.use('/store', storeRoutes);
router.use('/fares', fareRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'SHYAM SUPER APP Backend is running',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

module.exports = router;
