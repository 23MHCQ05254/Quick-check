export const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Unexpected server error';
  let details = error.details || null;

  // Mongoose cast/validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = error.errors || details;
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}: ${error.value}`;
  }

  // Handle common axios errors from downstream services
  if (error.isAxiosError) {
    statusCode = 502;
    message = 'Downstream service error';
    details = error.response?.data || error.message;
  }

  // Operational errors represented by ApiError will carry correct status
  if (error.statusCode) {
    statusCode = error.statusCode;
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
};

