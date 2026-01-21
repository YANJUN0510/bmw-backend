function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role) {
      const err = new Error('Unauthorized.');
      err.statusCode = 401;
      return next(err);
    }

    if (!allowedRoles.includes(role)) {
      const err = new Error('Forbidden.');
      err.statusCode = 403;
      return next(err);
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
