const crypto = require('crypto');

function requestContext(req, res, next) {
  const headerId = req.header('X-Request-Id');
  req.requestId = headerId || crypto.randomUUID();
  res.set('X-Request-Id', req.requestId);
  next();
}

module.exports = requestContext;
