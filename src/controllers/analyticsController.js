function notImplemented(res) {
  return res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'Analytics endpoints are not implemented yet.',
  });
}

exports.getOverview = async (req, res) => notImplemented(res);
