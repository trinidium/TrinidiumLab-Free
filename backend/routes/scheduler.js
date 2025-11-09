const express = require('express');
const router = express.Router();
const SchedulerController = require('../controllers/schedulerController');

// Routes
router.get('/status', SchedulerController.getQueueStatus);
router.get('/stats', SchedulerController.getQueueStats);
router.post('/clear', SchedulerController.clearQueue);
router.put('/config', SchedulerController.updateConfiguration);

module.exports = router;