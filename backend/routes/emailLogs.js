const express = require('express');
const router = express.Router();
const EmailLogsController = require('../controllers/emailLogsController');

// Routes
router.get('/', EmailLogsController.getEmailLogs);
router.get('/campaign-stats', EmailLogsController.getCampaignEmailStats);
router.get('/download/:type', EmailLogsController.downloadEmailLogs);

module.exports = router;