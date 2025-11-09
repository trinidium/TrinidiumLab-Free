const express = require('express');
const router = express.Router();
const ScheduledEmailsController = require('../controllers/scheduledEmailsController');

// Routes
router.post('/', ScheduledEmailsController.scheduleEmail);
router.get('/', ScheduledEmailsController.getScheduledEmails);
router.get('/:id', ScheduledEmailsController.getScheduledEmailById);
router.put('/:id/cancel', ScheduledEmailsController.cancelScheduledEmail);
router.delete('/:id', ScheduledEmailsController.deleteScheduledEmail);
router.put('/:id/reschedule', ScheduledEmailsController.rescheduleEmail);

module.exports = router;