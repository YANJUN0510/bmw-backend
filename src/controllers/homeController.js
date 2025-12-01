exports.getHome = (req, res) => {
  res.json({
    message: 'Welcome to the Solidoro Backend API',
    status: 'success',
  });
};
