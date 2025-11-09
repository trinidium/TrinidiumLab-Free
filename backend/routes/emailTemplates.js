const express = require('express');
const router = express.Router();
const emailTemplatesController = require('../controllers/emailTemplatesController');

// Define routes
router.post('/save', emailTemplatesController.save);
router.get('/latest', emailTemplatesController.getLatest);
router.get('/sequence/:sequenceId', emailTemplatesController.getBySequence);
router.delete('/sequence/:sequenceId', emailTemplatesController.deleteBySequence);

module.exports = router;