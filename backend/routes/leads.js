const express = require('express');
const router = express.Router();
const LeadsController = require('../controllers/leadsController');
const multer = require('multer');

// Multer configuration for CSV uploads
const upload = multer({ dest: 'uploads/' });

// Routes
router.get('/', LeadsController.getAllLeads);
router.get('/search', LeadsController.searchLeads);
router.post('/', LeadsController.createLead);
router.put('/:id/status', LeadsController.updateLeadStatus);
router.delete('/:id', LeadsController.deleteLead);
router.post('/import', upload.single('file'), LeadsController.importLeads);
router.delete('/', LeadsController.clearLeads);

module.exports = router;