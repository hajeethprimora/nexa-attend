const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error Stack:', err.stack || err);

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Something went wrong on the server!';

  res.status(statusCode).json({
    success: false,
    message: message
  });
};

module.exports = errorHandler;
