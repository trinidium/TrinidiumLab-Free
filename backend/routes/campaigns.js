const express = require('express');
const router = express.Router();
const CampaignsController = require('../controllers/campaignsController');

// Routes
router.get('/', CampaignsController.getAllCampaigns);
router.post('/', CampaignsController.createCampaign);
router.put('/:id/status', CampaignsController.updateCampaignStatus);
router.delete('/:id', CampaignsController.deleteCampaign);
router.get('/:id/stats', CampaignsController.getCampaignStats);
router.put('/:id/reset-daily-count', CampaignsController.resetDailyCount);
router.put('/:id/update-index', CampaignsController.updateLastSentIndex);
router.put('/:id/increment-daily-count', CampaignsController.incrementDailySentCount);
router.get('/:id/check-limit', CampaignsController.checkDailyLimit);

module.exports = router;