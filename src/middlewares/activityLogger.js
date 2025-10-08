const { ActivityLog } = require('../models');

// Middleware to log user activities
const logActivity = (action, resourceType) => {
  return async (req, res, next) => {
    // Store the original res.json to intercept successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log if the response is successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract resource ID from different sources
        let resourceId = null;
        
        // Try to get from response data
        if (data && data._id) {
          resourceId = data._id;
        } else if (data && data.order && data.order._id) {
          resourceId = data.order._id;
        } else if (data && data.item && data.item._id) {
          resourceId = data.item._id;
        } else if (data && data.gp && data.gp._id) {
          resourceId = data.gp._id;
        } else if (data && data.report && data.report._id) {
          resourceId = data.report._id;
        } else if (data && data.summary && data.summary._id) {
          resourceId = data.summary._id;
        } else if (data && data.record && data.record._id) {
          resourceId = data.record._id;
        } else if (data && data.user && data.user._id) {
          resourceId = data.user._id;
        } else if (req.params.id) {
          resourceId = req.params.id;
        }

        if (resourceId && req.user) {
          // Log activity asynchronously without blocking the response
          setImmediate(async () => {
            try {
              await ActivityLog.create({
                user: req.user._id,
                action,
                resourceType,
                resourceId,
                payload: {
                  method: req.method,
                  url: req.originalUrl,
                  body: req.body,
                  params: req.params,
                  query: req.query
                },
                description: `${action} performed on ${resourceType}`,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
              });
            } catch (error) {
              console.error('Error logging activity:', error);
            }
          });
        }
      }
      
      // Call the original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = { logActivity };
