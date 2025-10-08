const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Middleware to check if user has required role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Check if user can assign privileged roles
const canAssignPrivilegedRole = (role) => {
  const privilegedRoles = ['General_Manager', 'Director', 'Accounting', 'Mill_Supervisor', 'Loading', 'Unloading', 'Weighbridge', 'Stocks', 'Store_Keeper', 'Purchasing'];
  return !privilegedRoles.includes(role);
};

// Middleware to check role assignment permissions
const checkRoleAssignmentPermission = (req, res, next) => {
  const { role } = req.body;
  
  if (!role) {
    return next(); // No role specified, continue
  }

  // Check if the role being assigned is privileged
  if (!canAssignPrivilegedRole(role)) {
    // Only General_Manager and Director can assign privileged roles
    if (!['General_Manager', 'Director'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Cannot assign privileged role' });
    }
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  canAssignPrivilegedRole,
  checkRoleAssignmentPermission
};
