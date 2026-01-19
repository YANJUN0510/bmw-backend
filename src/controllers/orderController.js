function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Order endpoints are not implemented yet.',
  });
}

exports.createOrder = async (req, res) => notImplemented(res);
exports.getOrders = async (req, res) => notImplemented(res);
exports.getOrderById = async (req, res) => notImplemented(res);
exports.updateOrderStatus = async (req, res) => notImplemented(res);
