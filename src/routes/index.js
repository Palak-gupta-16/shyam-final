const express = require('express');
const authRoutes = require('./authRoutes');
const orderRoutes = require('./orderRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const gatePassRoutes = require('./gatePassRoutes');
const millRoutes = require('./millRoutes');
const storeRoutes = require('./storeRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/gatepasses', gatePassRoutes);
router.use('/mill', millRoutes);
router.use('/store', storeRoutes);
router.use('/reports', reportRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'SHYAM SUPER APP Backend is running',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

module.exports = router;
