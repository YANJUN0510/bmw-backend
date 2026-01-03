const crypto = require('crypto');

function base64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlEncodeJson(obj) {
  return base64urlEncode(JSON.stringify(obj));
}

function base64urlDecodeToString(input) {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signHmacSha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function signJwt(payload, secret, { expiresInSeconds = 60 * 60 * 24 } = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };

  const encodedHeader = base64urlEncodeJson(header);
  const encodedPayload = base64urlEncodeJson(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64urlEncode(signHmacSha256(signingInput, secret));

  return `${signingInput}.${signature}`;
}

function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'missing_token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed_token' };

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(base64urlDecodeToString(encodedHeader));
    payload = JSON.parse(base64urlDecodeToString(encodedPayload));
  } catch {
    return { ok: false, error: 'invalid_encoding' };
  }

  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
    return { ok: false, error: 'unsupported_jwt' };
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64urlEncode(signHmacSha256(signingInput, secret));
  if (!timingSafeEqual(expectedSignature, encodedSignature)) {
    return { ok: false, error: 'bad_signature' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
    return { ok: false, error: 'expired' };
  }

  return { ok: true, payload };
}

module.exports = { signJwt, verifyJwt };

