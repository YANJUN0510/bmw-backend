exports.getMe = (req, res) => {
  const auth = req.auth || {};
  res.json({
    status: 'success',
    auth,
  });
};
