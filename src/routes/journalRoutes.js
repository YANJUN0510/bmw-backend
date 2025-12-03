const express = require('express');
const router = express.Router();
const multer = require('multer');
const journalController = require('../controllers/journalController');

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', journalController.getAllJournals);
router.post('/', upload.single('image'), journalController.createJournal);
router.put('/:id', upload.single('image'), journalController.updateJournal);
router.delete('/:id', journalController.deleteJournal);
router.put('/:id/feature', journalController.setFeatured);

module.exports = router;
