const db = require('../config/database');

const emailTemplatesController = {
  // Save email template
  save: async (req, res) => {
    try {
      const { subject, body } = req.body;

      // Insert main email template
      const stmt = db.prepare(`
        INSERT INTO email_templates (subject, body, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(subject, body, function(err) {
        if (err) {
          console.error('Error saving email template:', err);
          return res.status(500).json({
            success: false,
            message: err.message
          });
        }
        
        const template = {
          id: this.lastID,
          subject,
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        res.status(201).json({
          success: true,
          data: template
        });
      });
      
      stmt.finalize();
    } catch (error) {
      console.error('Error saving email template:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get latest email templates
  getLatest: async (req, res) => {
    try {
      // Get the latest email template
      db.get(`
        SELECT * FROM email_templates 
        ORDER BY updated_at DESC 
        LIMIT 1
      `, (err, template) => {
        if (err) {
          console.error('Error getting latest email template:', err);
          return res.status(500).json({
            success: false,
            message: err.message
          });
        }
        
        res.status(200).json({
          success: true,
          data: {
            template
          }
        });
      });
    } catch (error) {
      console.error('Error getting latest email templates:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all by sequence
  getBySequence: async (req, res) => {
    try {
      const { sequenceId } = req.params;
      
      db.all(`
        SELECT * FROM email_templates 
        WHERE id = ?
      `, [sequenceId], (err, templates) => {
        if (err) {
          console.error('Error getting email template by ID:', err);
          return res.status(500).json({
            success: false,
            message: err.message
          });
        }
        
        res.status(200).json({
          success: true,
          data: templates
        });
      });
    } catch (error) {
      console.error('Error getting email template by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete by ID
  deleteBySequence: async (req, res) => {
    try {
      const { sequenceId } = req.params;
      
      db.run(`
        DELETE FROM email_templates 
        WHERE id = ?
      `, [sequenceId], function(err) {
        if (err) {
          console.error('Error deleting email template by ID:', err);
          return res.status(500).json({
            success: false,
            message: err.message
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'No email template found for the given ID'
          });
        }
        
        res.status(200).json({
          success: true,
          message: `Email template deleted successfully (${this.changes} template deleted)`
        });
      });
    } catch (error) {
      console.error('Error deleting email template by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = emailTemplatesController;