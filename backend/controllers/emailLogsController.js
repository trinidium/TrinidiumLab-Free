const db = require('../config/database');
const logger = require('../utils/logger');

class EmailLogsController {
  // Get email logs
  static async getEmailLogs(req, res) {
    try {
      const { campaignId, excludeTest } = req.query;
      
      let query = `
        SELECT el.*, l.name as lead_name, l.email as lead_email
        FROM email_logs el
        JOIN leads l ON el.lead_id = l.id
      `;
      const params = [];
      
      // Build WHERE clause
      let hasWhere = false;
      
      if (campaignId) {
        query += ` WHERE el.campaign_id = ?`;
        params.push(campaignId);
        hasWhere = true;
      }
      
      // Exclude test emails (emails without campaign_id) if requested
      if (excludeTest === 'true') {
        const separator = hasWhere ? ` AND` : ` WHERE`;
        query += ` ${separator} el.campaign_id IS NOT NULL`;
      }
      
      query += ` ORDER BY el.sent_at DESC`;
      
      db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('Database error fetching email logs:', err);
          return res.status(500).json({ error: 'Failed to fetch email logs' });
        }
        
        res.json({ success: true, data: rows });
      });
    } catch (error) {
      logger.error('Get email logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get campaign email stats (excluding test emails)
  static async getCampaignEmailStats(req, res) {
    try {
      let query = `
        SELECT 
          COUNT(CASE WHEN el.status = 'Sent' THEN 1 END) as sent,
          COUNT(CASE WHEN el.status = 'Failed' THEN 1 END) as failed,
          COUNT(*) as total
        FROM email_logs el
        JOIN leads l ON el.lead_id = l.id
        WHERE el.campaign_id IS NOT NULL
      `;
      
      // Optionally filter by date (today)
      query += ` AND DATE(el.sent_at) = DATE('now')`;
      
      db.get(query, [], (err, result) => {
        if (err) {
          logger.error('Database error fetching campaign email stats:', err);
          return res.status(500).json({ error: 'Failed to fetch campaign email stats' });
        }
        
        res.json({ 
          success: true, 
          data: {
            sent: result.sent || 0,
            failed: result.failed || 0,
            total: result.total || 0
          } 
        });
      });
    } catch (error) {
      logger.error('Get campaign email stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Download email logs as text file
  static async downloadEmailLogs(req, res) {
    try {
      const { type } = req.params; // 'success' or 'error'
      const { campaignId } = req.query;
      
      if (!['success', 'error'].includes(type)) {
        return res.status(400).json({ error: 'Invalid log type. Must be "success" or "error".' });
      }
      
      let query = `
        SELECT el.*, l.name as lead_name, l.email as lead_email
        FROM email_logs el
        JOIN leads l ON el.lead_id = l.id
        WHERE el.status = ?
      `;
      const params = [type === 'success' ? 'Sent' : 'Failed'];
      
      if (campaignId) {
        query += ` AND el.campaign_id = ?`;
        params.push(campaignId);
      }
      
      query += ` ORDER BY el.sent_at DESC`;
      
      db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('Database error fetching email logs for download:', err);
          return res.status(500).json({ error: 'Failed to fetch email logs' });
        }
        
        // Generate text content
        let content = `Email ${type} logs
`;
        content += `Generated on: ${new Date().toISOString()}

`;
        
        if (rows.length === 0) {
          content += `No ${type} emails found.
`;
        } else {
          content += `Total ${type} emails: ${rows.length}

`;
          rows.forEach((log, index) => {
            content += `${index + 1}. ${log.lead_name} <${log.lead_email}>
`;
            content += `   Sent at: ${log.sent_at}
`;
            if (log.error_message) {
              content += `   Error: ${log.error_message}
`;
            }
            content += `
`;
          });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=email-${type}-logs.txt`);
        
        res.send(content);
      });
    } catch (error) {
      logger.error('Download email logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = EmailLogsController;