function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Cart endpoints are not implemented yet.',
  });
}

exports.getCart = async (req, res) => notImplemented(res);
exports.addItem = async (req, res) => notImplemented(res);
exports.updateItem = async (req, res) => notImplemented(res);
exports.removeItem = async (req, res) => notImplemented(res);
