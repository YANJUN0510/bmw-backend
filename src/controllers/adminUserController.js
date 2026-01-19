function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Admin user endpoints are not implemented yet.',
  });
}

exports.getUsers = async (req, res) => notImplemented(res);
exports.getUserById = async (req, res) => notImplemented(res);
exports.updateUser = async (req, res) => notImplemented(res);
