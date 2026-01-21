const { jwtVerify, createRemoteJWKSet } = require('jose');
const supabase = require('../config/bmw_supabase');

const JWKS_URL = process.env.CLERK_JWKS_URL;
const jwks = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

function getBearerToken(req) {
  const header = req.header('Authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function verifyClerkToken(token) {
  if (!jwks) {
    const error = new Error('CLERK_JWKS_URL is not configured for JWT verification.');
    error.statusCode = 500;
    throw error;
  }

  const { payload } = await jwtVerify(token, jwks);
  return payload;
}

async function attachAuthContext(req, res, next) {
  if (!req.auth || !req.auth.clerkUserId) {
    return next();
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, disabled')
    .eq('clerk_user_id', req.auth.clerkUserId)
    .maybeSingle();

  if (error) {
    return next(error);
  }

  if (!profile) {
    req.auth.role = 'guest';
    return next();
  }

  if (profile.disabled) {
    const err = new Error('Account disabled.');
    err.statusCode = 403;
    return next(err);
  }

  req.auth.profileId = profile.id;
  req.auth.role = profile.role;

  if (profile.role === 'builder') {
    const { data: builderRecord, error: builderError } = await supabase
      .from('builders')
      .select('level')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (builderError) {
      return next(builderError);
    }

    req.auth.builderProfileId = profile.id;
    req.auth.builderLevel = builderRecord?.level || null;
  }

  if (profile.role === 'trader') {
    const { data: traderRecord, error: traderError } = await supabase
      .from('traders')
      .select('builder_profile_id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (traderError) {
      return next(traderError);
    }

    req.auth.builderProfileId = traderRecord?.builder_profile_id || null;
  }

  return next();
}

function optionalAuth() {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return next();
      }

      const payload = await verifyClerkToken(token);
      req.auth = {
        clerkUserId: payload.sub,
        sessionId: payload.sid,
      };

      return attachAuthContext(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
}

function requireAuth() {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        const err = new Error('Missing Authorization token.');
        err.statusCode = 401;
        throw err;
      }

      const payload = await verifyClerkToken(token);
      req.auth = {
        clerkUserId: payload.sub,
        sessionId: payload.sid,
      };

      return attachAuthContext(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  optionalAuth,
  requireAuth,
  attachAuthContext,
};
