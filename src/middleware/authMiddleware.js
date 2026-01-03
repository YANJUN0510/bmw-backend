const authConfig = require('../config/auth');
const { verifyJwt } = require('../utils/jwt');

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const { ok, payload, error } = verifyJwt(token, authConfig.jwtSecret);
  if (!ok) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized', error });
  }

  const username = payload.sub;
  const role = payload.role;
  if (!username || !role) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized', error: 'invalid_claims' });
  }

  req.user = { username, role };
  return next();
}

module.exports = { requireAuth };

