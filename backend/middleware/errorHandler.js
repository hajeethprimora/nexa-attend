const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
