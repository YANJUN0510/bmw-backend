function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Commission endpoints are not implemented yet.',
  });
}

exports.getLedger = async (req, res) => notImplemented(res);
exports.createAdjustment = async (req, res) => notImplemented(res);
