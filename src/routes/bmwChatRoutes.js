const express = require('express');
const router = express.Router();
const bmwChatController = require('../controllers/bmwChatController');
const bmwSupabase = require('../config/bmw_supabase');

router.post('/', bmwChatController.handleBmwChat);

// Test route to verify database connection
router.get('/test-db', async (req, res) => {
  try {
    const { data, error } = await bmwSupabase
      .from('building_material')
      .select('name, code, category, series, description, price, image, gallery, specs')
      .limit(3);

    if (error) {
      return res.json({
        status: 'error',
        message: error.message,
        error: error
      });
    }

    res.json({
      status: 'success',
      count: data.length,
      data: data
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message
    });
  }
});

module.exports = router;

