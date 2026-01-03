const crypto = require('crypto');

function scryptHash(password, { saltBytes = 16, keylen = 64 } = {}) {
  const salt = crypto.randomBytes(saltBytes);
  const derivedKey = crypto.scryptSync(password, salt, keylen);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

function scryptVerify(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { scryptHash, scryptVerify };

