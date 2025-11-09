const { google } = require('googleapis');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const RichTextProcessor = require('../utils/richTextProcessor');
const tokenStorage = require('../utils/tokenStorage');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

class GmailController {
  // Helper function to process redirect URIs
  static processRedirectUris(redirectUris) {
    if (!redirectUris || !Array.isArray(redirectUris)) {
      return [];
    }
    
    return redirectUris.map(uri => {
      // Replace localhost URLs that are different from our expected callback URL
      if (uri && typeof uri === 'string') {
        // If it's a localhost URL but not our expected callback, replace it
        if ((uri.startsWith('https://localhost') || uri.startsWith('http://localhost')) &&
            uri !== 'http://localhost:3001/api/gmail/callback') {
          return 'http://localhost:3001/api/gmail/callback';
        }
      }
      return uri;
    });
  }

  // Upload Gmail credentials
  static async uploadCredentials(req, res) {
    try {
      const { credentials } = req.body;

      if (!credentials) {
        return res.status(400).json({ error: 'Credentials are required' });
      }

      const web = credentials.web || credentials.installed;
      if (!web || !web.client_id || !web.client_secret) {
        return res.status(400).json({ error: 'Invalid credentials format' });
      }

      // Process redirect URIs to ensure correct callback URL
      const processedWeb = { ...web };
      if (web.redirect_uris) {
        processedWeb.redirect_uris = GmailController.processRedirectUris(web.redirect_uris);
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO credentials 
        (user_id, client_id, client_secret, project_id, auth_uri, token_uri, 
         auth_provider_x509_cert_url, redirect_uris, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        'default_user',
        processedWeb.client_id,
        processedWeb.client_secret,
        processedWeb.project_id || null,
        processedWeb.auth_uri || null,
        processedWeb.token_uri || null,
        processedWeb.auth_provider_x509_cert_url || null,
        JSON.stringify(processedWeb.redirect_uris || []),
        function(err) {
          if (err) {
            logger.error('Database error saving credentials:', err);
            return res.status(500).json({ error: 'Failed to save credentials' });
          }

          logger.info('Gmail credentials uploaded successfully');
          res.json({
            success: true,
            message: 'Credentials uploaded successfully',
            credentialsId: this.lastID
          });
        }
      );

      stmt.finalize();
    } catch (error) {
      logger.error('Upload credentials error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get Gmail authentication URL
  static async getAuthUrl(req, res) {
    try {
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM credentials WHERE user_id = ?', ['default_user'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!row) {
        return res.status(400).json({ error: 'Gmail credentials not configured' });
      }

      const redirectUris = JSON.parse(row.redirect_uris);
      // Use the environment variable if available, otherwise fallback to default
      const redirectUri = process.env.GMAIL_REDIRECT_URI || redirectUris[0] || `http://localhost:3001/api/gmail/callback`;

      const oauth2Client = new google.auth.OAuth2(
        row.client_id,
        row.client_secret,
        redirectUri
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.send'],
        prompt: 'consent'
      });

      logger.info('Generated Gmail auth URL', { redirectUri, authUrl });
      res.json({ authUrl });

    } catch (error) {
      logger.error('Get auth URL error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handle OAuth2 callback
  static async handleCallback(req, res) {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const row = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM credentials WHERE user_id = ?', ['default_user'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!row) {
        return res.status(400).json({ error: 'Gmail credentials not configured' });
      }

      const redirectUris = JSON.parse(row.redirect_uris);
      // Use the environment variable if available, otherwise fallback to default
      const redirectUri = process.env.GMAIL_REDIRECT_URI || redirectUris[0] || `http://localhost:3001/api/gmail/callback`;

      const oauth2Client = new google.auth.OAuth2(
        row.client_id,
        row.client_secret,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);

      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        created_at: new Date().toISOString()
      };

      const saved = tokenStorage.saveToken('default_user', tokenData);
      if (!saved) {
        logger.error('Failed to save tokens securely');
        return res.status(500).json({ error: 'Failed to save tokens. Check server logs for details.' });
      }

      const stmt = db.prepare(`
        UPDATE credentials 
        SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);

      stmt.run(
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        'default_user'
      );

      stmt.finalize();

      logger.info('Gmail authentication successful');
      // Send a message to the frontend to notify successful authentication
      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
          </head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS', token: '${tokens.access_token}' }, 'http://localhost:3000');
              }
              window.close();
            </script>
            <p>Authentication successful! You can close this window.</p>
          </body>
        </html>
      `);

    } catch (error) {
      logger.error('OAuth2 callback error:', error);
      res.send(`
        <html>
          <head>
            <title>Authentication Failed</title>
          </head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_AUTH_ERROR', error: '${error.message}' }, 'http://localhost:3000');
              }
              window.close();
            </script>
            <p>Authentication failed: ${error.message}. You can close this window.</p>
          </body>
        </html>
      `);
    }
  }

  // Check Gmail authentication status
  static async checkAuthStatus(req, res) {
    try {
      const row = await new Promise((resolve, reject) => {
        db.get(`
          SELECT client_id, access_token, refresh_token, token_expiry 
          FROM credentials 
          WHERE user_id = ?
        `, ['default_user'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!row) {
        return res.json({
          success: true,
          authenticated: false,
          hasCredentials: false,
          message: 'No credentials found'
        });
      }

      // Check secure token storage as well
      let secureTokenData = tokenStorage.loadToken('default_user');
      let isAuthenticated = false;
      let isExpired = false;
      
      if (secureTokenData) {
        // Use secure token data which may have updated expiry
        isAuthenticated = !!secureTokenData.access_token;
        isExpired = secureTokenData.expiry ? new Date(secureTokenData.expiry) < new Date() : false;
      } else {
        // Fallback to database token if secure storage is not available
        isAuthenticated = !!row.access_token;
        isExpired = row.token_expiry ? new Date(row.token_expiry) < new Date() : false;
      }

      res.json({
        success: true,
        authenticated: isAuthenticated, // Don't check expiration for persistent auth, refresh happens when needed
        hasCredentials: !!row.client_id,
        message: isAuthenticated ? (isExpired ? 'Token expired but will be refreshed automatically' : 'Authenticated') : 'Credentials found but not authenticated'
      });

    } catch (error) {
      logger.error('Check auth status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Send email via Gmail API
  static async sendEmail(req, res) {
    try {
      const { to, subject, body, variables = {}, attachments = [], campaignId } = req.body;

      logger.info('Starting sendEmail process', { to, hasCampaignId: !!campaignId, hasAttachments: attachments.length > 0 });

      if (!to || !subject || !body) {
        logger.warn('Missing required email parameters', { to: !!to, subject: !!subject, body: !!body });
        return res.status(400).json({ error: 'To, subject, and body are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        logger.warn('Invalid email format', { to });
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      const processedSubject = RichTextProcessor.processTemplate(subject, variables);
      const processedBody = RichTextProcessor.processTemplate(body, variables);
      const sanitizedBody = RichTextProcessor.sanitizeHtml(processedBody);

      logger.info('Processed email template', { to, subject: processedSubject });

      // Initialize oauth2Client
      let oauth2Client;
      let tokenSource = 'secure_storage';
      
      let secureTokenData = tokenStorage.loadToken('default_user');
      logger.info('Secure token data loaded', { hasToken: !!secureTokenData });
      
      if (secureTokenData) {
        logger.info('Using secure token storage for authentication', { 
          hasToken: !!secureTokenData.access_token,
          hasRefreshToken: !!secureTokenData.refresh_token,
          expiry: secureTokenData.expiry
        });
        
        // Check if the token is expired and refresh if possible
        if (secureTokenData.expiry && new Date(secureTokenData.expiry) < new Date() && secureTokenData.refresh_token) {
          logger.info('Token expired, refreshing automatically', { userId: 'default_user' });
          
          try {
            // Create a temporary client to refresh the token
            const row = await new Promise((resolve, reject) => {
              db.get(`
                SELECT client_id, client_secret, redirect_uris
                FROM credentials 
                WHERE user_id = ?
              `, ['default_user'], (err, row) => {
                if (err) {
                  logger.error('Database error fetching client credentials for refresh', err);
                  reject(err);
                } else {
                  resolve(row);
                }
              });
            });

            if (!row) {
              logger.error('Client credentials not found for token refresh');
              return res.status(400).json({ error: 'Gmail credentials not configured' });
            }

            const redirectUris = JSON.parse(row.redirect_uris);
            const redirectUri = process.env.GMAIL_REDIRECT_URI || redirectUris[0] || `http://localhost:3001/api/gmail/callback`;

            const tempOauth2Client = new google.auth.OAuth2(
              row.client_id,
              row.client_secret,
              redirectUri
            );

            tempOauth2Client.setCredentials({
              refresh_token: secureTokenData.refresh_token
            });

            // Refresh the access token
            const newTokens = await tempOauth2Client.refreshAccessToken();
            const newTokenData = {
              access_token: newTokens.credentials.access_token,
              refresh_token: secureTokenData.refresh_token, // Keep the existing refresh token
              expiry: newTokens.credentials.expiry_date ? new Date(newTokens.credentials.expiry_date).toISOString() : null,
              created_at: new Date().toISOString()
            };

            // Save the new token data
            const saved = tokenStorage.saveToken('default_user', newTokenData);
            if (saved) {
              logger.info('Refreshed token saved successfully');
              // Update the secureTokenData with new access token
              secureTokenData = newTokenData;
            } else {
              logger.error('Failed to save refreshed token');
            }
          } catch (refreshError) {
            logger.error('Failed to refresh token:', refreshError);
            // If refresh fails, fall back to database credentials if available
          }
        }

        oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: secureTokenData.access_token,
          refresh_token: secureTokenData.refresh_token
        });
      } else {
        logger.info('Secure token not found, checking database credentials');
        const row = await new Promise((resolve, reject) => {
          db.get(`
            SELECT access_token, refresh_token, client_id, client_secret, redirect_uris
            FROM credentials 
            WHERE user_id = ?
          `, ['default_user'], (err, row) => {
            if (err) {
              logger.error('Database error fetching credentials', err);
              reject(err);
            } else {
              logger.info('Database credentials fetched', { hasAccessToken: !!row?.access_token });
              resolve(row);
            }
          });
        });

        if (!row || !row.access_token) {
          logger.warn('No access token found in database');
          return res.status(400).json({ error: 'Gmail not authenticated' });
        }

        const redirectUris = JSON.parse(row.redirect_uris);
        // Use the environment variable if available, otherwise fallback to default
        const redirectUri = process.env.GMAIL_REDIRECT_URI || redirectUris[0] || `http://localhost:3001/api/gmail/callback`;

        logger.info('Using database credentials for authentication', { redirectUri, hasRefreshToken: !!row.refresh_token });
        oauth2Client = new google.auth.OAuth2(
          row.client_id,
          row.client_secret,
          redirectUri
        );

        // Check if the token from database is expired and refresh if possible
        if (row.token_expiry && new Date(row.token_expiry) < new Date() && row.refresh_token) {
          logger.info('Database token expired, refreshing automatically');
          
          oauth2Client.setCredentials({
            refresh_token: row.refresh_token
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
            
            // Update the credentials to use the new token
            oauth2Client.setCredentials({
              access_token: newTokens.credentials.access_token,
              refresh_token: row.refresh_token
            });
            
            logger.info('Database token refreshed successfully');
          } catch (refreshError) {
            logger.error('Failed to refresh database token:', refreshError);
            return res.status(400).json({ error: 'Failed to refresh expired authentication token' });
          }
        } else {
          oauth2Client.setCredentials({
            access_token: row.access_token,
            refresh_token: row.refresh_token
          });
        }
        
        tokenSource = 'database';
      }

      logger.info('OAuth2 client initialized', { tokenSource });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build email message with attachments
      let messageLines = [
        `To: ${to}`,
        `Subject: ${processedSubject}`,
        'MIME-Version: 1.0'
      ];

      if (attachments && attachments.length > 0) {
        logger.info('Processing email with attachments', { attachmentCount: attachments.length });
        // Create multipart message for attachments
        const boundary = '__trinidiumlab_boundary__';
        messageLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageLines.push('');
        messageLines.push(`--${boundary}`);
        messageLines.push('Content-Type: text/html; charset=utf-8');
        messageLines.push('');
        messageLines.push(sanitizedBody);
        messageLines.push('');

        // Add attachments
        for (const attachment of attachments) {
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
        logger.info('Processing email without attachments');
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

      logger.info('Attempting to send email via Gmail API', { to, subject: processedSubject });
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      logger.info('Email sent successfully via Gmail API', { to, messageId: result.data.id });

      // Log successful email to database
      const leadRow = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM leads WHERE email = ?', [to], (err, row) => {
          if (err) {
            logger.error('Database error finding lead by email', err);
            reject(err);
          } else {
            logger.info('Lead found for email logging', { leadId: row?.id, email: to });
            resolve(row);
          }
        });
      });

      if (leadRow) {
        // For emails sent as part of a campaign, record the campaign_id
        // For single test emails, campaignId will be undefined and will be excluded from campaign stats
        if (campaignId) {
          logger.info('Recording campaign email log', { leadId: leadRow.id, campaignId });
          const logStmt = db.prepare(`
            INSERT INTO email_logs (lead_id, campaign_id, status, sent_at)
            VALUES (?, ?, 'Sent', CURRENT_TIMESTAMP)
          `);
          logStmt.run(leadRow.id, campaignId);
          logStmt.finalize();
        } else {
          logger.info('Recording test email log', { leadId: leadRow.id });
          // For test emails, do not record a campaign_id to exclude from campaign stats
          const logStmt = db.prepare(`
            INSERT INTO email_logs (lead_id, status, sent_at)
            VALUES (?, 'Sent', CURRENT_TIMESTAMP)
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
      }

      logger.info('Email sent successfully', { to, subject: processedSubject, messageId: result.data.id });

      res.json({
        success: true,
        messageId: result.data.id,
        message: 'Email sent successfully'
      });

    } catch (error) {
      logger.error('Send email error:', error);
      
      // Check if it's an authentication error and log appropriately
      if (error.message.includes('Invalid Credentials') || error.message.includes('unauthorized') || error.message.includes('access_denied')) {
        logger.info('Authentication error detected, token may need re-authentication', { error: error.message });
      }
      
      // Log failed email to database
      try {
        const leadRow = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM leads WHERE email = ?', [to], (err, row) => {
            if (err) {
              logger.error('Database error finding lead for failed email', err);
              reject(err);
            } else {
              logger.info('Lead found for failed email logging', { leadId: row?.id, email: to });
              resolve(row);
            }
          });
        });

        if (leadRow) {
          // For emails sent as part of a campaign, record the campaign_id
          // For single test emails, campaignId will be undefined and will be excluded from campaign stats
          if (req.body.campaignId) {
            logger.info('Recording failed campaign email log', { leadId: leadRow.id, campaignId: req.body.campaignId });
            const logStmt = db.prepare(`
              INSERT INTO email_logs (lead_id, campaign_id, status, error_message, sent_at)
              VALUES (?, ?, 'Failed', ?, CURRENT_TIMESTAMP)
            `);
            logStmt.run(leadRow.id, req.body.campaignId, error.message);
            logStmt.finalize();
          } else {
            logger.info('Recording failed test email log', { leadId: leadRow.id });
            // For test emails, do not record a campaign_id to exclude from campaign stats
            const logStmt = db.prepare(`
              INSERT INTO email_logs (lead_id, status, error_message, sent_at)
              VALUES (?, 'Failed', ?, CURRENT_TIMESTAMP)
            `);
            logStmt.run(leadRow.id, error.message);
            logStmt.finalize();
          }
          
          // Update the lead status to 'Failed' in the leads table
          const updateStmt = db.prepare(`
            UPDATE leads SET status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `);
          updateStmt.run(leadRow.id);
          updateStmt.finalize();
          
          logger.info('Lead status updated to Failed', { leadId: leadRow.id });
        }
      } catch (logError) {
        logger.error('Error logging failed email to database:', logError);
      }

      logger.error('Send email error:', error);
      res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
  }

  // Send personalized emails to multiple recipients
  static async sendBulkEmails(req, res) {
    try {
      const { recipients, subject, body, attachments = [], campaignId } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients array is required' });
      }

      if (!subject || !body) {
        return res.status(400).json({ error: 'Subject and body are required' });
      }

      // Import the email scheduler with path validation
      let emailScheduler;
      try {
        const path = require('path');
        const schedulerPath = path.join(__dirname, '../utils/emailScheduler');
        emailScheduler = require(schedulerPath);
      } catch (error) {
        logger.error('Failed to import email scheduler in sendBulkEmails:', error);
        return res.status(500).json({ error: 'Failed to initialize email scheduler' });
      }
      
      let successCount = 0;
      let failureCount = 0;
      const results = [];
      const errors = [];

      // Add each email to the scheduler queue
      for (const recipient of recipients) {
        try {
          const emailData = {
            to: recipient.email,
            subject,
            body,
            variables: {
              name: recipient.name || '',
              email: recipient.email || '',
              company: recipient.company || ''
            },
            attachments,
            campaignId: campaignId || null
          };

          const added = emailScheduler.addToQueue(emailData);

          if (added) {
            results.push({
              email: recipient.email,
              status: 'queued'
            });
            successCount++;
          } else {
            throw new Error('Failed to queue email - daily limit reached');
          }
        } catch (emailError) {
          errors.push({
            email: recipient.email,
            error: emailError.message,
            status: 'failed'
          });
          failureCount++;
        }
      }

      res.json({
        success: true,
        message: `Queued ${successCount} emails for sending, ${failureCount} failed to queue`,
        sent: results,
        failed: errors,
        totalCount: recipients.length
      });

    } catch (error) {
      logger.error('Bulk send email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Remove credentials and token files
  static async removeCredentials(req, res) {
    try {
      // Remove credentials from database
      const stmt = db.prepare(`
        UPDATE credentials 
        SET client_id = NULL, client_secret = NULL, project_id = NULL, auth_uri = NULL, 
            token_uri = NULL, auth_provider_x509_cert_url = NULL, redirect_uris = '[]',
            access_token = NULL, refresh_token = NULL, token_expiry = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);

      stmt.run('default_user');
      stmt.finalize();

      // Remove token file if it exists
      const tokenDeleted = tokenStorage.deleteToken('default_user');

      logger.info('Gmail credentials and tokens removed successfully');
      res.json({
        success: true,
        message: 'Gmail credentials and authentication tokens removed successfully'
      });

    } catch (error) {
      logger.error('Remove credentials error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Add email to scheduler queue
  static async queueEmail(req, res) {
    try {
      const { to, subject, body, variables = {}, attachments = [], campaignId, delaySeconds, dailyLimit } = req.body;

      logger.info('Queueing email for sending', { to, hasCampaignId: !!campaignId, hasAttachments: attachments.length > 0, delaySeconds, dailyLimit });

      if (!to || !subject || !body) {
        logger.warn('Missing required email parameters for queue', { to: !!to, subject: !!subject, body: !!body });
        return res.status(400).json({ error: 'To, subject, and body are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        logger.warn('Invalid email format for queue', { to });
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      
      logger.info('Checking Gmail credentials for queue');
      
      // Check if we have basic Gmail credentials to allow queuing
      // (authentication will be checked and handled by scheduler when sending)
      let row;
      try {
        logger.info('Executing database query to check credentials');
        row = await new Promise((resolve, reject) => {
          db.get(`
            SELECT client_id, access_token, refresh_token, token_expiry 
            FROM credentials 
            WHERE user_id = ?
          `, ['default_user'], (err, row) => {
            if (err) {
              logger.error('Database error checking credentials for queue', err);
              reject(err);
            } else {
              logger.info('Database query completed successfully', { hasRow: !!row, hasClientId: !!(row && row.client_id) });
              resolve(row);
            }
          });
        });
      } catch (dbError) {
        logger.error('Database operation failed when checking credentials for queue:', dbError);
        return res.status(500).json({ error: 'Database error checking credentials' });
      }

      // Check if basic credentials exist
      if (!row || !row.client_id) {
        logger.warn('No Gmail credentials found for queue');
        return res.status(400).json({ error: 'Gmail credentials not configured' });
      }

      // Check if we have valid access token to allow queuing
      // We'll use the same authentication logic as in sendEmail
      let hasValidAuth = false;
      
      // First check secure token storage
      let secureTokenData = tokenStorage.loadToken('default_user');
      if (secureTokenData && secureTokenData.access_token) {
        // Check if the token is expired 
        if (secureTokenData.expiry && new Date(secureTokenData.expiry) < new Date()) {
          // Token has expired, we'll need to rely on refresh token or check database
          if (!secureTokenData.refresh_token) {
            // No refresh token, authentication is invalid
            logger.warn('Secure token expired and no refresh token available');
          } else {
            // There's a refresh token, so we can potentially refresh later
            hasValidAuth = true;
          }
        } else {
          // Token is not expired
          hasValidAuth = true;
        }
      } 
      
      // If not authenticated via secure storage, check database
      if (!hasValidAuth && row.access_token) {
         if (row.token_expiry && new Date(row.token_expiry) < new Date()) {
          // Token has expired, check if we have a refresh token
          if (row.refresh_token) {
            // Has refresh token, can potentially refresh later
            hasValidAuth = true;
          } else {
            logger.warn('Database token expired and no refresh token available');
          }
        } else {
          // Token is not expired
          hasValidAuth = true;
        }
      }
      
      if (!hasValidAuth) {
        logger.warn('No valid authentication found for queuing emails');
        return res.status(400).json({ 
          error: 'Gmail not authenticated - please authenticate before queuing emails' 
        });
      }
      
      logger.info('Gmail authentication validated, importing email scheduler');
      
      // Import the email scheduler with path validation
      let emailScheduler;
      try {
        // Construct the path to ensure it's correct
        const path = require('path');
        const schedulerPath = path.join(__dirname, '../utils/emailScheduler');
        logger.info('Attempting to require email scheduler from path:', schedulerPath);
        
        // Use dynamic import to avoid potential circular dependency issues
        const emailSchedulerModule = require(schedulerPath);
        emailScheduler = emailSchedulerModule;
        logger.info('Email scheduler imported successfully');
      } catch (importError) {
        logger.error('Failed to import email scheduler:', importError);
        // Log more detailed error information to help with debugging
        logger.error('Error details:', {
          message: importError.message,
          stack: importError.stack,
          code: importError.code
        });
        return res.status(500).json({ error: 'Failed to initialize email scheduler', details: importError.message });
      }
      
      // Update scheduler configuration if provided
      if (delaySeconds && typeof delaySeconds === 'number') {
        try {
          emailScheduler.setDelay(delaySeconds * 1000); // Convert to milliseconds
          logger.info('Updated scheduler delay', { delayMs: delaySeconds * 1000 });
        } catch (configError) {
          logger.error('Failed to update scheduler delay:', configError);
          // Continue anyway as this is not critical
        }
      }
      
      if (dailyLimit && typeof dailyLimit === 'number') {
        try {
          emailScheduler.setDailyLimit(dailyLimit);
          logger.info('Updated scheduler daily limit', { dailyLimit });
        } catch (configError) {
          logger.error('Failed to update scheduler daily limit:', configError);
          // Continue anyway as this is not critical
        }
      }
      
      // Handle scheduled email if scheduledTime is provided
      if (req.body.scheduledTime) {
        const { scheduledTime } = req.body;
        
        // Validate scheduled time
        const scheduledDate = new Date(scheduledTime);
        if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
          logger.warn('Invalid scheduled time provided', { scheduledTime });
          return res.status(400).json({ error: 'Scheduled time must be a valid future date/time' });
        }
        
        // Find lead by email
        const leadRow = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM leads WHERE email = ?', [to], (err, row) => {
            if (err) {
              logger.error('Database error finding lead by email:', err);
              reject(err);
            } else {
              logger.info('Lead found for scheduling', { leadId: row?.id, email: to });
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

            logger.info('Email scheduled successfully to database', { 
              to, 
              scheduledTime,
              scheduledId: this.lastID 
            });

            // Check for newly scheduled emails and process them
            emailScheduler.checkAndProcessScheduledEmails();

            res.status(201).json({ 
              success: true, 
              message: 'Email scheduled successfully',
              data: {
                id: this.lastID,
                lead_id: leadRow.id,
                campaign_id: campaignId || null,
                subject,
                scheduled_time: scheduledTime,
                status: 'pending'
              }
            });
          }
        );

        stmt.finalize();
      } else {
        // Add email to queue (existing functionality)
        const emailData = {
          to,
          subject,
          body,
          variables,
          attachments,
          campaignId
        };
        
        logger.info('Adding email to queue', { to, subject });
        
        let added;
        try {
          added = emailScheduler.addToQueue(emailData);
        } catch (queueError) {
          logger.error('Failed to add email to queue:', queueError);
          return res.status(500).json({ error: 'Failed to queue email' });
        }
        
        if (added) {
          logger.info('Email queued successfully', { to, subject });
          res.json({
            success: true,
            message: 'Email queued successfully',
            data: { to, subject }
          });
        } else {
          logger.warn('Email not queued - daily limit reached', { to, subject });
          res.status(400).json({
            success: false,
            error: 'Email could not be queued - daily limit reached'
          });
        }
      }
    } catch (error) {
      logger.error('Queue email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Get Gmail credentials information (without sensitive data)
  static async getCredentialsInfo(req, res) {
    try {
      const row = await new Promise((resolve, reject) => {
        db.get(`
          SELECT client_id, project_id, auth_uri, created_at, updated_at
          FROM credentials 
          WHERE user_id = ?
        `, ['default_user'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!row) {
        return res.json({
          success: true,
          hasCredentials: false,
          credentials: null
        });
      }

      // Return only non-sensitive credential information
      const credentialsInfo = {
        client_id: row.client_id ? `${row.client_id.substring(0, 10)}...` : null, // Partially masked
        project_id: row.project_id,
        auth_uri: row.auth_uri,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      res.json({
        success: true,
        hasCredentials: true,
        credentials: credentialsInfo
      });

    } catch (error) {
      logger.error('Get credentials info error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Update scheduler configuration
  static async updateSchedulerConfig(req, res) {
    try {
      const { delayBetweenEmails, dailyLimit } = req.body;
      
      let emailScheduler;
      try {
        const path = require('path');
        const schedulerPath = path.join(__dirname, '../utils/emailScheduler');
        emailScheduler = require(schedulerPath);
      } catch (error) {
        logger.error('Failed to import email scheduler in updateSchedulerConfig:', error);
        return res.status(500).json({ error: 'Failed to initialize email scheduler' });
      }
      
      if (delayBetweenEmails !== undefined && typeof delayBetweenEmails === 'number') {
        emailScheduler.setDelay(delayBetweenEmails);
        logger.info('Scheduler delay updated', { delayMs: delayBetweenEmails });
      }
      
      if (dailyLimit !== undefined && typeof dailyLimit === 'number') {
        emailScheduler.setDailyLimit(dailyLimit);
        logger.info('Scheduler daily limit updated', { dailyLimit });
      }
      
      res.json({
        success: true,
        message: 'Scheduler configuration updated successfully'
      });
      
    } catch (error) {
      logger.error('Update scheduler config error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = GmailController;
