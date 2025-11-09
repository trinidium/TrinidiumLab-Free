const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./logger');

// Import required modules at the top to avoid circular dependencies
let db;
let google;
let tokenStorage;
let RichTextProcessor;

try {
  db = require('../config/database');
  google = require('googleapis').google;
  tokenStorage = require('./tokenStorage');
  RichTextProcessor = require('./richTextProcessor');
} catch (error) {
  logger.error('Failed to initialize required modules in emailScheduler:', error);
}

// Rate limiter for email sending (Gmail limits)
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of emails
  duration: 60, // Per minute
});

class EmailScheduler {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.delayBetweenEmails = 10000; // 10 seconds default
    this.dailyLimit = 1000; // Gmail daily limit
    this.sentToday = 0;
    this.lastReset = new Date().toDateString();
    
    // Initialize scheduled emails check interval
    this.scheduledEmailsInterval = null;
    this.startScheduledEmailsChecker();
  }
  
  // Start the scheduled emails checker
  startScheduledEmailsChecker() {
    // Check for scheduled emails every minute
    this.scheduledEmailsInterval = setInterval(() => {
      this.checkAndProcessScheduledEmails();
    }, 60000); // Check every minute

    // Also run an initial check immediately
    setTimeout(() => {
      this.checkAndProcessScheduledEmails();
    }, 5000); // Check again after 5 seconds when the system starts
  }
  
  // Set delay between emails
  setDelay(delayMs) {
    this.delayBetweenEmails = delayMs;
  }
  
  // Set daily limit
  setDailyLimit(limit) {
    this.dailyLimit = limit;
  }
  
  // Reset daily counter if needed
  resetDailyCounter() {
    const today = new Date().toDateString();
    if (this.lastReset !== today) {
      this.sentToday = 0;
      this.lastReset = today;
      logger.info('Daily email counter reset');
    }
  }
  
  // Add email to queue
  addToQueue(emailData) {
    // Reset daily counter if needed
    this.resetDailyCounter();
    
    // Check daily limit
    if (this.sentToday >= this.dailyLimit) {
      logger.warn('Daily email limit reached', { 
        sentToday: this.sentToday, 
        dailyLimit: this.dailyLimit 
      });
      return false;
    }
    
    this.queue.push({
      ...emailData,
      queuedAt: new Date()
    });
    
    logger.info('Email added to queue', { 
      to: emailData.to,
      subject: emailData.subject,
      queueLength: this.queue.length
    });
    
    // Start processing if not already started
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return true;
  }
  
  // Process email queue
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      logger.info('Email queue processing completed');
      return;
    }
    
    this.isProcessing = true;
    const email = this.queue.shift();
    
    try {
      // Reset daily counter if needed
      this.resetDailyCounter();
      
      // Check daily limit
      if (this.sentToday >= this.dailyLimit) {
        logger.warn('Daily email limit reached during processing', { 
          sentToday: this.sentToday, 
          dailyLimit: this.dailyLimit 
        });
        
        // Re-add email to queue for tomorrow
        this.queue.unshift(email);
        this.isProcessing = false;
        return;
      }
      
      // Check rate limit
      await rateLimiter.consume('global', 1);
      
      // Send email (this would call the Gmail send function)
      logger.info('Sending email', { 
        to: email.to,
        subject: email.subject
      });
      
      // Increment sent counter
      this.sentToday++;
      
      // Actually send email via Gmail API
      await this.sendEmail(email);

      // Process next email after delay
      setTimeout(() => this.processQueue(), this.delayBetweenEmails);
    } catch (error) {
      if (error.code === 429) {
        logger.warn('Rate limit exceeded, retrying in 1 second');
        // Put email back in queue
        this.queue.unshift(email);
        setTimeout(() => this.processQueue(), 1000);
      } else {
        logger.error('Failed to send email', { 
          error: error.message,
          to: email.to,
          subject: email.subject
        });
        
        // Process next email
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }
  
  // Send email using Gmail API
  async sendEmail(emailData) {
    try {
      // Get Gmail credentials using the already imported db module
      if (!db) {
        throw new Error('Database module not available');
      }
      
      const credentialsRow = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM credentials WHERE user_id = ?', ['default_user'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!credentialsRow || !credentialsRow.client_id) {
        logger.error('Gmail credentials not configured when sending email from scheduler');
        throw new Error('Gmail credentials not configured');
      }

      // Initialize Gmail API client
      const { google } = require('googleapis');
      const tokenStorage = require('./tokenStorage');
      let secureTokenData = null;
      
      try {
        if (tokenStorage) {
          secureTokenData = tokenStorage.loadToken('default_user');
        }
      } catch (storageError) {
        logger.error('Error loading token from storage:', storageError);
        // Continue with database credentials if storage fails
      }
      
      let oauth2Client;

      if (secureTokenData && secureTokenData.access_token) {
        logger.info('Using secure token storage for scheduler email authentication', {
          hasToken: !!secureTokenData.access_token,
          hasRefreshToken: !!secureTokenData.refresh_token,
          expiry: secureTokenData.expiry
        });

        // Check if the token is expired and refresh if possible
        if (secureTokenData.expiry && new Date(secureTokenData.expiry) < new Date() && secureTokenData.refresh_token) {
          logger.info('Secure token expired, refreshing automatically in scheduler', { userId: 'default_user' });

          if (!google || !google.auth) {
            throw new Error('Google APIs module not available');
          }

          oauth2Client = new google.auth.OAuth2(
            credentialsRow.client_id,
            credentialsRow.client_secret,
            'http://localhost:3001/api/gmail/callback'
          );

          oauth2Client.setCredentials({
            refresh_token: secureTokenData.refresh_token
          });

          try {
            // Refresh the access token
            const newTokens = await oauth2Client.refreshAccessToken();
            const newTokenData = {
              access_token: newTokens.credentials.access_token,
              refresh_token: secureTokenData.refresh_token, // Keep the existing refresh token
              expiry: newTokens.credentials.expiry_date ? new Date(newTokens.credentials.expiry_date).toISOString() : null,
              created_at: new Date().toISOString()
            };

            // Save the new token data
            try {
              if (tokenStorage) {
                const saved = tokenStorage.saveToken('default_user', newTokenData);
                if (saved) {
                  logger.info('Refreshed token saved successfully for scheduler');
                  // Update the secureTokenData with new access token
                  secureTokenData = newTokenData;
                } else {
                  logger.error('Failed to save refreshed token for scheduler');
                }
              }
            } catch (saveError) {
              logger.error('Error saving refreshed token:', saveError);
            }
          } catch (refreshError) {
            logger.error('Failed to refresh token for scheduler:', refreshError);
            // Fall back to database credentials if refresh fails
          }
        }

        // Create new client with the possibly updated token
        oauth2Client = new google.auth.OAuth2(
          credentialsRow.client_id,
          credentialsRow.client_secret,
          'http://localhost:3001/api/gmail/callback'
        );

        oauth2Client.setCredentials({
          access_token: secureTokenData.access_token,
          refresh_token: secureTokenData.refresh_token
        });
      } else {
        logger.info('Using database credentials for scheduler email authentication');

        // Check if the token from database is expired and refresh if possible
        if (credentialsRow.token_expiry && new Date(credentialsRow.token_expiry) < new Date() && credentialsRow.refresh_token) {
          logger.info('Database token expired, refreshing automatically for scheduler');

          if (!google || !google.auth) {
            throw new Error('Google APIs module not available');
          }

          oauth2Client = new google.auth.OAuth2(
            credentialsRow.client_id,
            credentialsRow.client_secret,
            'http://localhost:3001/api/gmail/callback'
          );

          oauth2Client.setCredentials({
            refresh_token: credentialsRow.refresh_token
          });

          try {
            // Refresh the access token
            const newTokens = await oauth2Client.refreshAccessToken();

            // Update the database with new token
            const updateStmt = db.prepare(`
              UPDATE credentials 
              SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = ?
            `);

            updateStmt.run(
              newTokens.credentials.access_token,
              newTokens.credentials.expiry_date ? new Date(newTokens.credentials.expiry_date).toISOString() : null,
              'default_user'
            );

            updateStmt.finalize();

            // Update the client to use the new token
            oauth2Client.setCredentials({
              access_token: newTokens.credentials.access_token,
              refresh_token: credentialsRow.refresh_token
            });

            logger.info('Database token refreshed successfully for scheduler');
          } catch (refreshError) {
            logger.error('Failed to refresh database token for scheduler:', refreshError);
            throw new Error('Failed to refresh expired authentication token');
          }
        } else {
          oauth2Client = new google.auth.OAuth2(
            credentialsRow.client_id,
            credentialsRow.client_secret,
            'http://localhost:3001/api/gmail/callback'
          );

          oauth2Client.setCredentials({
            access_token: credentialsRow.access_token,
            refresh_token: credentialsRow.refresh_token
          });
        }
      }

      if (!google) {
        throw new Error('Google APIs module not available');
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Process variables in template
      if (!RichTextProcessor) {
        throw new Error('RichTextProcessor module not available');
      }
      
      const processedSubject = RichTextProcessor.processTemplate(emailData.subject, emailData.variables || {});
      const processedBody = RichTextProcessor.processTemplate(emailData.body, emailData.variables || {});
      const sanitizedBody = RichTextProcessor.sanitizeHtml(processedBody);

      // Build email message with attachments
      let messageLines = [
        `To: ${emailData.to}`,
        `Subject: ${processedSubject}`,
        'MIME-Version: 1.0'
      ];

      if (emailData.attachments && emailData.attachments.length > 0) {
        // Create multipart message for attachments
        const boundary = '__trinidiumlab_boundary__' + Date.now();
        messageLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageLines.push('');
        messageLines.push(`--${boundary}`);
        messageLines.push('Content-Type: text/html; charset=utf-8');
        messageLines.push('');
        messageLines.push(sanitizedBody);
        messageLines.push('');

        // Add attachments
        for (const attachment of emailData.attachments) {
          messageLines.push(`--${boundary}`);
          messageLines.push(`Content-Type: application/octet-stream; name="${attachment.filename}"`);
          messageLines.push('Content-Transfer-Encoding: base64');
          messageLines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
          messageLines.push('');
          messageLines.push(attachment.content);
          messageLines.push('');
        }

        messageLines.push(`--${boundary}--`);
      } else {
        // Simple HTML email without attachments
        messageLines.push('Content-Type: text/html; charset=utf-8');
        messageLines.push('');
        messageLines.push(sanitizedBody);
      }

      const message = messageLines.join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email via Gmail API
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      // Log successful email to database
      if (db) {
        const leadRow = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM leads WHERE email = ?', [emailData.to], (err, row) => {
            if (err) {
              logger.error('Database error finding lead by email', err);
              reject(err);
            } else {
              resolve(row);
            }
          });
        });

        if (leadRow) {
          let parentEmailLogId = null;
          
          // For emails sent as part of a campaign, record the campaign_id
          if (emailData.campaignId) {
            logger.info('Recording campaign email log from scheduler', { 
              leadId: leadRow.id, 
              campaignId: emailData.campaignId,
              emailType: emailData.emailType || 'main',
              parentEmailLogId: emailData.parentEmailLogId
            });
            
            let logStmt;
            let insertedEmailLogId;
            
            // This is a main email
            logStmt = db.prepare(`
              INSERT INTO email_logs (lead_id, campaign_id, template_id, email_type, status, sent_at)
              VALUES (?, ?, ?, 'main', 'Sent', CURRENT_TIMESTAMP)
            `);
            logStmt.run(leadRow.id, emailData.campaignId, emailData.templateId);
            
            // Get the ID of the inserted email log
            insertedEmailLogId = await new Promise((resolve, reject) => {
              db.get(`SELECT last_insert_rowid() as id`, [], (err, result) => {
                if (err) reject(err);
                else resolve(result.id);
              });
            });
            
            logStmt.finalize();
          } else {
            logger.info('Recording test email log from scheduler', { leadId: leadRow.id });
            // For test emails, do not record a campaign_id to exclude from campaign stats
            const logStmt = db.prepare(`
              INSERT INTO email_logs (lead_id, status, sent_at, email_type)
              VALUES (?, 'Sent', CURRENT_TIMESTAMP, 'test')
            `);
            logStmt.run(leadRow.id);
            logStmt.finalize();
          }
          
          // Update the lead status to 'Sent' in the leads table
          const updateStmt = db.prepare(`
            UPDATE leads SET status = 'Sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `);
          updateStmt.run(leadRow.id);
          updateStmt.finalize();
          
          logger.info('Lead status updated to Sent', { leadId: leadRow.id });
          
          // If this is part of a campaign, increment the daily sent count
          if (emailData.campaignId) {
            try {
              await new Promise((resolve, reject) => {
                db.run('UPDATE campaigns SET daily_sent_count = daily_sent_count + 1, sent_count = sent_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                  [emailData.campaignId], 
                  function(err) {
                    if (err) {
                      logger.error('Database error incrementing daily sent count:', err);
                      reject(err);
                    } else {
                      if (this.changes === 0) {
                        logger.warn('No campaign updated for sent count increment', { campaignId: emailData.campaignId });
                      }
                      resolve();
                    }
                  }
                );
              });
            } catch (countError) {
              logger.error('Error incrementing campaign sent count:', countError);
            }
          }
        }
      } else {
        logger.warn('Database not available, skipping email logging');
      }

      logger.info('Email sent successfully from scheduler', { 
        to: emailData.to,
        subject: processedSubject,
        messageId: result && result.data && result.data.id ? result.data.id : 'unknown' 
      });

      return {
        success: true,
        messageId: result && result.data && result.data.id ? result.data.id : null
      };
    } catch (error) {
      logger.error('Error sending email from scheduler:', error.message);

      // Log failed email to database
      try {
        if (db) {
          const leadRow = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM leads WHERE email = ?', [emailData.to], (err, row) => {
              if (err) {
                logger.error('Database error finding lead for failed email', err);
                reject(err);
              } else {
                resolve(row);
              }
            });
          });

          if (leadRow) {
            let logStmt;
            
            // For emails sent as part of a campaign, record the campaign_id
            if (emailData.campaignId) {
              logger.info('Recording failed campaign email log from scheduler', { 
                leadId: leadRow.id, 
                campaignId: emailData.campaignId,
                emailType: emailData.emailType || 'main'
              });
              
              // For failed main emails
              logStmt = db.prepare(`
                INSERT INTO email_logs (lead_id, campaign_id, template_id, email_type, status, error_message, sent_at)
                VALUES (?, ?, ?, 'main', 'Failed', ?, CURRENT_TIMESTAMP)
              `);
              logStmt.run(leadRow.id, emailData.campaignId, emailData.templateId, error.message);
            } else {
              logger.info('Recording failed test email log from scheduler', { leadId: leadRow.id });
              // For test emails, do not record a campaign_id to exclude from campaign stats
              logStmt = db.prepare(`
                INSERT INTO email_logs (lead_id, status, error_message, sent_at, email_type)
                VALUES (?, 'Failed', ?, CURRENT_TIMESTAMP, 'test')
              `);
              logStmt.run(leadRow.id, error.message);
            }
            
            logStmt.finalize();
            
            // Update the lead status to 'Failed' in the leads table
            const updateStmt = db.prepare(`
              UPDATE leads SET status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `);
            updateStmt.run(leadRow.id);
            updateStmt.finalize();
            
            logger.info('Lead status updated to Failed', { leadId: leadRow.id });
            
            // If this is part of a campaign, increment the daily sent count and failed count
            if (emailData.campaignId) {
              try {
                await new Promise((resolve, reject) => {
                  db.run('UPDATE campaigns SET daily_sent_count = daily_sent_count + 1, failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                    [emailData.campaignId], 
                    function(err) {
                      if (err) {
                        logger.error('Database error incrementing daily sent count for failed email:', err);
                        reject(err);
                      } else {
                        if (this.changes === 0) {
                          logger.warn('No campaign updated for sent count increment (failed email)', { campaignId: emailData.campaignId });
                        }
                        resolve();
                      }
                    }
                  );
                });
              } catch (countError) {
                logger.error('Error incrementing campaign sent/failed count (failed email):', countError);
              }
            }
          }
        } else {
          logger.warn('Database not available, skipping failed email logging');
        }
      } catch (logError) {
        logger.error('Error logging failed email to database:', logError);
      }

      throw error;
    }
  }
  
  // Parse delay string in DD-HH-MM format to JSON object
  parseDelayString(delayString) {
    if (typeof delayString !== 'string') {
      return { days: 0, hours: 0, minutes: 0 };
    }
    
    // Support both DD-HH-MM format and already JSON format
    if (delayString.startsWith('{') && delayString.endsWith('}')) {
      try {
        return JSON.parse(delayString);
      } catch (e) {
        logger.error('Invalid JSON format for delay:', delayString);
        return { days: 0, hours: 0, minutes: 0 };
      }
    }
    
    // Parse DD-HH-MM format
    const parts = delayString.split('-');
    if (parts.length !== 3) {
      logger.warn('Invalid delay format, using default:', delayString);
      return { days: 0, hours: 0, minutes: 0 };
    }
    
    const days = parseInt(parts[0]) || 0;
    const hours = parseInt(parts[1]) || 0;
    const minutes = parseInt(parts[2]) || 0;
    
    return { days, hours, minutes };
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      sentToday: this.sentToday,
      dailyLimit: this.dailyLimit,
      lastReset: this.lastReset
    };
  }
  
  // Get queue statistics
  getQueueStats() {
    const now = new Date();
    const today = now.toDateString();
    
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      sentToday: this.sentToday,
      dailyLimit: this.dailyLimit,
      remainingToday: Math.max(0, this.dailyLimit - this.sentToday),
      lastReset: this.lastReset,
      willResetTomorrow: this.lastReset !== today
    };
  }
  
  // Clear queue
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.isProcessing = false;
    logger.info('Email queue cleared', { clearedCount });
    return clearedCount;
  }
  
  // Pause processing
  pause() {
    this.isProcessing = false;
    logger.info('Email queue processing paused');
  }
  
  // Resume processing
  resume() {
    if (this.queue.length > 0 && !this.isProcessing) {
      this.isProcessing = true;
      this.processQueue();
      logger.info('Email queue processing resumed');
    }
  }
  
  // Check if campaign daily limit is reached
  async checkCampaignDailyLimit(campaignId) {
    try {
      const campaign = await new Promise((resolve, reject) => {
        if (!db) {
          reject(new Error('Database not available'));
          return;
        }
        
        db.get(`
          SELECT daily_limit, daily_sent_count, daily_sent_reset_date
          FROM campaigns
          WHERE id = ?
        `, [campaignId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
      
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }
      
      const today = new Date().toISOString().split('T')[0];
      let currentCount = campaign.daily_sent_count;
      
      // Reset count if date has changed
      if (campaign.daily_sent_reset_date !== today) {
        currentCount = 0;
      }
      
      const isLimitReached = currentCount >= campaign.daily_limit;
      
      return {
        isLimitReached,
        dailyLimit: campaign.daily_limit,
        dailySentCount: currentCount,
        remaining: Math.max(0, campaign.daily_limit - currentCount)
      };
    } catch (error) {
      logger.error('Error checking campaign daily limit:', error);
      throw error;
    }
  }
  
  // Check for and process scheduled emails
  async checkAndProcessScheduledEmails() {
    try {
      if (!db) {
        logger.error('Database not available for scheduled emails processing');
        return;
      }
      
      const now = new Date().toISOString();
      
      // Find all pending scheduled emails that are due to be sent
      const dueEmails = await new Promise((resolve, reject) => {
        db.all(`
          SELECT se.*, l.email, l.name, l.company
          FROM scheduled_emails se
          LEFT JOIN leads l ON se.lead_id = l.id
          WHERE se.status = 'pending' AND se.scheduled_time <= ?
          ORDER BY se.scheduled_time ASC
        `, [now], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
      
      if (dueEmails.length === 0) {
        logger.info('No scheduled emails are due for sending');
        return;
      }
      
      logger.info(`Found ${dueEmails.length} scheduled emails that are due for sending`);
      
      // Process each due email
      for (const scheduledEmail of dueEmails) {
        try {
          // Create email data object from scheduled email
          const emailData = {
            to: scheduledEmail.email,
            subject: scheduledEmail.subject,
            body: scheduledEmail.body,
            variables: scheduledEmail.variables ? JSON.parse(scheduledEmail.variables) : {},
            attachments: scheduledEmail.attachments ? JSON.parse(scheduledEmail.attachments) : [],
            campaignId: scheduledEmail.campaign_id,
            templateId: scheduledEmail.template_id,
            scheduledId: scheduledEmail.id // Indicate this is from a scheduled email
          };
          
          // Update the scheduled email status to 'sent' in the database
          const updateStmt = db.prepare(`
            UPDATE scheduled_emails 
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          
          updateStmt.run([scheduledEmail.id], function(err) {
            if (err) {
              logger.error(`Failed to update scheduled email status for ID ${scheduledEmail.id}:`, err);
            } else {
              logger.info(`Scheduled email ${scheduledEmail.id} status updated to 'sent'`);
            }
          });
          
          updateStmt.finalize();
          
          // Send the email immediately
          await this.sendEmail(emailData);
          
          logger.info(`Scheduled email ${scheduledEmail.id} sent successfully to ${scheduledEmail.email}`);
          
        } catch (emailError) {
          logger.error(`Failed to send scheduled email ${scheduledEmail.id}:`, emailError);
          
          // Update the scheduled email status to 'failed' in the database
          const updateStmt = db.prepare(`
            UPDATE scheduled_emails 
            SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          
          updateStmt.run([emailError.message, scheduledEmail.id], function(err) {
            if (err) {
              logger.error(`Failed to update scheduled email status to failed for ID ${scheduledEmail.id}:`, err);
            } else {
              logger.info(`Scheduled email ${scheduledEmail.id} status updated to 'failed'`);
            }
          });
          
          updateStmt.finalize();
        }
      }
    } catch (error) {
      logger.error('Error in checkAndProcessScheduledEmails:', error);
    }
  }
}

// Singleton instance
const emailScheduler = new EmailScheduler();

module.exports = emailScheduler;