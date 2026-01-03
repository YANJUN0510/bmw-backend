const { scryptHash } = require('../utils/password');

function loadUsersFromEnv() {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeUsers(users) {
  return users
    .filter(Boolean)
    .map((u) => ({
      username: String(u.username || '').trim(),
      role: String(u.role || '').trim(),
      displayName: u.displayName ? String(u.displayName) : undefined,
      passwordHash: u.passwordHash ? String(u.passwordHash) : undefined,
      password: u.password ? String(u.password) : undefined,
    }))
    .filter((u) => u.username && u.role && (u.passwordHash || u.password));
}

function defaultUsers() {
  return [
    { username: 'builder', role: 'builder', displayName: 'Builder', passwordHash: scryptHash('builder123') },
    { username: 'trader', role: 'trader', displayName: 'Trader', passwordHash: scryptHash('trader123') },
    { username: 'quest', role: 'quest', displayName: 'Quest', passwordHash: scryptHash('quest123') },
  ];
}

const users = normalizeUsers(loadUsersFromEnv() || defaultUsers());

module.exports = {
  jwtSecret: process.env.AUTH_JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresInSeconds: Number(process.env.AUTH_JWT_EXPIRES_SECONDS || 60 * 60 * 24),
  users,
};

