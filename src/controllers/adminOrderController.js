function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Admin order endpoints are not implemented yet.',
  });
}

exports.getOrders = async (req, res) => notImplemented(res);
exports.getOrderById = async (req, res) => notImplemented(res);
exports.exportOrders = async (req, res) => notImplemented(res);
