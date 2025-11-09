const axios = require('axios');
const { google } = require('googleapis');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';

// Test function to create a scheduled email
async function testScheduledEmail() {
  try {
    // Calculate a future time (2 minutes from now)
    const futureTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const scheduledTime = futureTime.toISOString();

    // Test data for scheduled email
    const emailData = {
      to: 'test@example.com',  // Replace with a real test email
      subject: 'Test Scheduled Email',
      body: '<p>This is a <strong>test scheduled email</strong> sent at: {{current_time}}</p>',
      variables: {
        current_time: new Date().toISOString()
      },
      scheduledTime: scheduledTime,
      attachments: []  // Add any attachments if needed
    };

    console.log('Scheduling email for:', scheduledTime);

    // Make the API request to schedule the email
    const response = await axios.post(`${BASE_URL}/gmail/queue`, emailData);

    console.log('Email scheduling response:', response.data);

    // Let's also test fetching scheduled emails
    setTimeout(async () => {
      try {
        console.log('\nFetching scheduled emails...');
        const scheduledResponse = await axios.get(`${BASE_URL}/scheduled-emails`);
        console.log('Scheduled emails:', scheduledResponse.data);
      } catch (fetchError) {
        console.error('Error fetching scheduled emails:', fetchError.response?.data || fetchError.message);
      }
    }, 5000); // Wait 5 seconds then fetch scheduled emails

    return response.data;
  } catch (error) {
    console.error('Error scheduling email:', error.response?.data || error.message);
    throw error;
  }
}

// Test function to create a scheduled email via the specific scheduled emails endpoint
async function testScheduledEmailEndpoint() {
  try {
    // Calculate a future time (1 minute from now)
    const futureTime = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now
    const scheduledTime = futureTime.toISOString();

    // Test data for scheduled email
    const emailData = {
      to: 'test@example.com',  // Replace with a real test email
      subject: 'Test Scheduled Email via Endpoint',
      body: '<p>This is a <strong>test scheduled email</strong> sent via dedicated endpoint at: {{current_time}}</p>',
      variables: {
        current_time: new Date().toISOString()
      },
      scheduledTime: scheduledTime,
      attachments: []  // Add any attachments if needed
    };

    console.log('Scheduling email via dedicated endpoint for:', scheduledTime);

    // Make the API request to schedule the email via the dedicated endpoint
    const response = await axios.post(`${BASE_URL}/scheduled-emails`, emailData);

    console.log('Email scheduling response via dedicated endpoint:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error scheduling email via dedicated endpoint:', error.response?.data || error.message);
    throw error;
  }
}

// Test function to run all tests
async function runTests() {
  console.log('Starting scheduled email functionality tests...\n');
  
  try {
    await testScheduledEmail();
    console.log('\n');
    await testScheduledEmailEndpoint();
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTests failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  testScheduledEmail,
  testScheduledEmailEndpoint,
  runTests
};