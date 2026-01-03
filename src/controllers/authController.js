const authConfig = require('../config/auth');
const { signJwt } = require('../utils/jwt');
const { scryptVerify } = require('../utils/password');

function sanitizeUser(user) {
  return {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
}

function login(req, res) {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'username and password required' });
  }

  const user = authConfig.users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  const ok = user.passwordHash ? scryptVerify(password, user.passwordHash) : password === user.password;
  if (!ok) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  const token = signJwt(
    { sub: user.username, role: user.role },
    authConfig.jwtSecret,
    { expiresInSeconds: authConfig.jwtExpiresInSeconds },
  );

  return res.status(200).json({
    status: 'ok',
    token,
    user: sanitizeUser(user),
  });
}

function me(req, res) {
  return res.status(200).json({ status: 'ok', user: req.user });
}

module.exports = { login, me };

