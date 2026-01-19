function notFoundHandler(req, res, next) {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Not Found',
    requestId: req.requestId,
  });
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR');

  res.status(status).json({
    code,
    message: err.message || 'Internal Server Error',
    requestId: req.requestId,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
