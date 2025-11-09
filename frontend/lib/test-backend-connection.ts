// test-backend-connection.ts
import ApiClient from './apiClient';

async function testBackendConnection() {
  try {
    console.log('Testing backend connection...');
    
    // Test health check
    const health = await ApiClient.healthCheck();
    console.log('Health check:', health);
    
    // Test Gmail status
    const gmailStatus = await ApiClient.checkGmailStatus();
    console.log('Gmail status:', gmailStatus);
    
    // Test leads
    const leads = await ApiClient.getAllLeads();
    console.log('Leads:', leads);
    
    console.log('Backend connection test completed successfully!');
  } catch (error) {
    console.error('Backend connection test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBackendConnection();
}

export default testBackendConnection;