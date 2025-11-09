// Test script to verify Gmail authentication status
const { google } = require('googleapis');
const db = require('./config/database');
const tokenStorage = require('./utils/tokenStorage');
const logger = require('./utils/logger');

async function testGmailAuth() {
  console.log('Testing Gmail authentication...');

  try {
    // First, check if credentials exist in database
    const row = await new Promise((resolve, reject) => {
      db.get(`
        SELECT client_id, access_token, refresh_token, token_expiry, redirect_uris
        FROM credentials 
        WHERE user_id = ?
      `, ['default_user'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!row) {
      console.log('❌ No Gmail credentials found in database');
      return;
    }

    console.log('✅ Gmail credentials found in database');
    console.log('Has client_id:', !!row.client_id);
    console.log('Has access_token:', !!row.access_token);
    console.log('Has refresh_token:', !!row.refresh_token);
    console.log('Token expiry:', row.token_expiry);

    // Check secure token storage
    const secureTokenData = tokenStorage.loadToken('default_user');
    console.log('Secure token storage has data:', !!secureTokenData);
    
    if (secureTokenData) {
      console.log('Secure token access_token exists:', !!secureTokenData.access_token);
      console.log('Secure token refresh_token exists:', !!secureTokenData.refresh_token);
      console.log('Secure token expiry:', secureTokenData.expiry);
    }

    // Determine which token to use
    let access_token, refresh_token;
    if (secureTokenData && secureTokenData.access_token) {
      console.log('Using token from secure storage');
      access_token = secureTokenData.access_token;
      refresh_token = secureTokenData.refresh_token;
    } else if (row.access_token) {
      console.log('Using token from database');
      access_token = row.access_token;
      refresh_token = row.refresh_token;
    } else {
      console.log('❌ No valid access token found anywhere');
      return;
    }

    // Check if token is expired
    const isExpired = row.token_expiry ? new Date(row.token_expiry) < new Date() : false;
    if (isExpired) {
      console.log('⚠️  Access token is expired');
    } else {
      console.log('✅ Access token is not expired');
    }

    // Test the authentication by creating an OAuth2 client
    const redirectUris = JSON.parse(row.redirect_uris || '[]');
    const redirectUri = process.env.GMAIL_REDIRECT_URI || redirectUris[0] || `http://localhost:3001/api/gmail/callback`;

    const oauth2Client = new google.auth.OAuth2(
      row.client_id,
      row.client_secret, // This may be null if only using secure storage
      redirectUri
    );

    oauth2Client.setCredentials({
      access_token: access_token,
      refresh_token: refresh_token
    });

    // Try to make a simple Gmail API call to verify authentication
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log('Making test API call to Gmail...');
    const profile = await gmail.users.getProfile({ userId: 'me' });

    console.log('✅ Gmail authentication is working!');
    console.log('User email:', profile.data.emailAddress);
    console.log('Name:', profile.data.name);
    console.log('Messages total:', profile.data.messagesTotal);
    console.log('Threads total:', profile.data.threadsTotal);

  } catch (error) {
    console.log('❌ Gmail authentication test failed:', error.message);
    if (error.message.includes('invalid_grant') || error.message.includes('invalid_request')) {
      console.log('💡 This error usually means the refresh token is invalid or expired.');
      console.log('💡 You may need to re-authenticate with Gmail.');
    } else if (error.message.includes('access_denied') || error.message.includes('accessNotConfigured')) {
      console.log('💡 This error usually means the Gmail API is not enabled in your Google Cloud Console project.');
    }
  }
}

// Run the test
testGmailAuth().then(() => {
  console.log('\nTest completed.');
}).catch(console.error);