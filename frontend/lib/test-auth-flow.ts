// test-auth-flow.ts
import ApiClient from './apiClient';

async function testAuthFlow() {
  try {
    console.log('Testing Gmail authentication flow...');
    
    // Test health check
    const health = await ApiClient.healthCheck();
    console.log('Backend health:', health);
    
    // Test Gmail status (should show not authenticated initially)
    const initialStatus = await ApiClient.checkGmailStatus();
    console.log('Initial Gmail status:', initialStatus);
    
    console.log('To test full authentication flow:');
    console.log('1. Make sure both frontend (port 3000) and backend (port 3001) are running');
    console.log('2. Upload your Gmail credentials JSON file in the frontend UI');
    console.log('3. Click "Authenticate Gmail" button');
    console.log('4. Complete the OAuth flow in the popup window');
    console.log('5. The popup should close automatically and show success message');
    
  } catch (error) {
    console.error('Auth flow test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAuthFlow();
}

export default testAuthFlow;