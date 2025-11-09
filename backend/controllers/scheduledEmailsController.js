const db = require('../config/database');
const emailScheduler = require('../utils/emailScheduler');
const logger = require('../utils/logger');

class ScheduledEmailsController {
  // Schedule an email to be sent at a specific time
  static async scheduleEmail(req, res) {
    try {
      const { to, subject, body, variables = {}, attachments = [], campaignId, scheduledTime } = req.body;

      if (!to || !subject || !body || !scheduledTime) {
        return res.status(400).json({ error: 'To, subject, body, and scheduledTime are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      // Validate scheduled time
      const scheduledDate = new Date(scheduledTime);
      if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be a valid future date/time' });
      }

      // Find lead by email
      const leadRow = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM leads WHERE email = ?', [to], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      if (!leadRow) {
        return res.status(400).json({ error: 'Lead not found for the specified email' });
      }

      // Insert scheduled email into the database
      const stmt = db.prepare(`
        INSERT INTO scheduled_emails 
        (lead_id, campaign_id, subject, body, variables, attachments, scheduled_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        leadRow.id,
        campaignId || null,
        subject,
        body,
        JSON.stringify(variables),
        JSON.stringify(attachments),
        scheduledTime,
        function(err) {
          if (err) {
            logger.error('Database error scheduling email:', err);
            return res.status(500).json({ error: 'Failed to schedule email' });
          }

          const scheduledEmail = {
            id: this.lastID,
            lead_id: leadRow.id,
            campaign_id: campaignId || null,
            subject,
            body,
            variables,
            attachments,
            scheduled_time: scheduledTime,
            status: 'pending',
            created_at: new Date().toISOString()
          };

          logger.info('Email scheduled successfully', { 
            id: this.lastID, 
            to, 
            scheduledTime 
          });

          // Check for newly scheduled emails and process them
          emailScheduler.checkAndProcessScheduledEmails();

          res.status(201).json({ 
            success: true, 
            message: 'Email scheduled successfully',
            data: scheduledEmail 
          });
        }
      );

      stmt.finalize();

    } catch (error) {
      logger.error('Schedule email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all scheduled emails
  static async getScheduledEmails(req, res) {
    try {
      // Parse query parameters
      const { campaignId, status, limit = 100, offset = 0 } = req.query;
      
      let query = `
        SELECT se.*, l.email, l.name
        FROM scheduled_emails se
        LEFT JOIN leads l ON se.lead_id = l.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (campaignId) {
        query += ` AND se.campaign_id = ?`;
        params.push(campaignId);
      }
      
      if (status) {
        query += ` AND se.status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY se.scheduled_time ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('Database error fetching scheduled emails:', err);
          return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
        }

        // Parse variables and attachments from JSON strings
        const scheduledEmails = rows.map(row => ({
          id: row.id,
          lead_id: row.lead_id,
          campaign_id: row.campaign_id,
          subject: row.subject,
          body: row.body,
          variables: row.variables ? JSON.parse(row.variables) : {},
          attachments: row.attachments ? JSON.parse(row.attachments) : [],
          scheduled_time: row.scheduled_time,
          status: row.status,
          sent_at: row.sent_at,
          error_message: row.error_message,
          created_at: row.created_at,
          updated_at: row.updated_at,
          lead_email: row.email,
          lead_name: row.name
        }));

        res.json({ success: true, data: scheduledEmails, count: scheduledEmails.length });
      });

    } catch (error) {
      logger.error('Get scheduled emails error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get a specific scheduled email by ID
  static async getScheduledEmailById(req, res) {
    try {
      const { id } = req.params;

      const stmt = db.prepare(`
        SELECT se.*, l.email, l.name
        FROM scheduled_emails se
        LEFT JOIN leads l ON se.lead_id = l.id
        WHERE se.id = ?
      `);

      stmt.get([id], (err, row) => {
        if (err) {
          logger.error('Database error fetching scheduled email:', err);
          return res.status(500).json({ error: 'Failed to fetch scheduled email' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Scheduled email not found' });
        }

        // Parse variables and attachments from JSON strings
        const scheduledEmail = {
          id: row.id,
          lead_id: row.lead_id,
          campaign_id: row.campaign_id,
          subject: row.subject,
          body: row.body,
          variables: row.variables ? JSON.parse(row.variables) : {},
          attachments: row.attachments ? JSON.parse(row.attachments) : [],
          scheduled_time: row.scheduled_time,
          status: row.status,
          sent_at: row.sent_at,
          error_message: row.error_message,
          created_at: row.created_at,
          updated_at: row.updated_at,
          lead_email: row.email,
          lead_name: row.name
        };

        res.json({ success: true, data: scheduledEmail });
      });

      stmt.finalize();

    } catch (error) {
      logger.error('Get scheduled email by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Cancel a scheduled email
  static async cancelScheduledEmail(req, res) {
    try {
      const { id } = req.params;

      const stmt = db.prepare(`
        UPDATE scheduled_emails 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = 'pending'
      `);

      stmt.run([id], function(err) {
        if (err) {
          logger.error('Database error cancelling scheduled email:', err);
          return res.status(500).json({ error: 'Failed to cancel scheduled email' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Scheduled email not found or already processed' });
        }

        logger.info('Scheduled email cancelled', { id });

        res.json({ 
          success: true, 
          message: 'Scheduled email cancelled successfully' 
        });
      });

      stmt.finalize();

    } catch (error) {
      logger.error('Cancel scheduled email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete a scheduled email completely
  static async deleteScheduledEmail(req, res) {
    try {
      const { id } = req.params;

      const stmt = db.prepare(`
        DELETE FROM scheduled_emails 
        WHERE id = ?
      `);

      stmt.run([id], function(err) {
        if (err) {
          logger.error('Database error deleting scheduled email:', err);
          return res.status(500).json({ error: 'Failed to delete scheduled email' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Scheduled email not found' });
        }

        logger.info('Scheduled email deleted', { id });

        res.json({ 
          success: true, 
          message: 'Scheduled email deleted successfully' 
        });
      });

      stmt.finalize();

    } catch (error) {
      logger.error('Delete scheduled email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reschedule an existing scheduled email
  static async rescheduleEmail(req, res) {
    try {
      const { id } = req.params;
      const { scheduledTime } = req.body;

      if (!scheduledTime) {
        return res.status(400).json({ error: 'New scheduledTime is required' });
      }

      // Validate scheduled time
      const scheduledDate = new Date(scheduledTime);
      if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be a valid future date/time' });
      }

      const stmt = db.prepare(`
        UPDATE scheduled_emails 
        SET scheduled_time = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status IN ('pending', 'failed')
      `);

      stmt.run([scheduledTime, id], function(err) {
        if (err) {
          logger.error('Database error rescheduling email:', err);
          return res.status(500).json({ error: 'Failed to reschedule email' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Scheduled email not found or cannot be rescheduled' });
        }

        logger.info('Scheduled email rescheduled', { 
          id, 
          newScheduledTime: scheduledTime 
        });

        // Check for newly scheduled emails and process them
        emailScheduler.checkAndProcessScheduledEmails();

        res.json({ 
          success: true, 
          message: 'Email rescheduled successfully' 
        });
      });

      stmt.finalize();

    } catch (error) {
      logger.error('Reschedule email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ScheduledEmailsController;