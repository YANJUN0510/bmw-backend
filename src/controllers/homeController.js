exports.getHome = (req, res) => {
  res.json({
    message: 'Welcome to the BMW Backend API',
    status: 'success',
  });
};
