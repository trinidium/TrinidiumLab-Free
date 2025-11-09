const express = require('express');
const router = express.Router();
const GmailController = require('../controllers/gmailController');
const multer = require('multer');

// Multer configuration for file uploads
const upload = multer({ dest: 'uploads/' });

// Routes
router.post('/credentials', GmailController.uploadCredentials);
router.get('/auth', GmailController.getAuthUrl);
router.get('/callback', GmailController.handleCallback);
router.get('/status', GmailController.checkAuthStatus);
router.get('/credentials', GmailController.getCredentialsInfo); // Get credential information
router.post('/send', GmailController.sendEmail);
router.post('/send-bulk', GmailController.sendBulkEmails);
router.post('/queue', GmailController.queueEmail);
router.post('/scheduler/config', GmailController.updateSchedulerConfig); // Update scheduler config
router.delete('/credentials', GmailController.removeCredentials);

module.exports = router;