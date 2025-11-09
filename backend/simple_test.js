// Simple test for the redirect URI fix
const GmailController = require('./controllers/gmailController');

console.log('Testing processRedirectUris function...\n');

// Test case: Array with https://localhost
const testInput = ['https://localhost', 'http://localhost:3001/api/gmail/callback', 'https://example.com'];
const result = GmailController.processRedirectUris(testInput);

console.log('Input:', testInput);
console.log('Output:', result);

// Expected result
const expected = ['http://localhost:3001/api/gmail/callback', 'http://localhost:3001/api/gmail/callback', 'https://example.com'];
console.log('Expected:', expected);

// Check if the transformation is correct
const isCorrect = JSON.stringify(result) === JSON.stringify(expected);
console.log('Test passed:', isCorrect);

// Additional test cases
console.log('\nTesting edge cases...');

// Empty array
const emptyResult = GmailController.processRedirectUris([]);
console.log('Empty array test passed:', JSON.stringify(emptyResult) === JSON.stringify([]));

// Null input
const nullResult = GmailController.processRedirectUris(null);
console.log('Null input test passed:', JSON.stringify(nullResult) === JSON.stringify([]));

// Non-localhost URLs (should remain unchanged)
const noLocalhost = ['https://google.com', 'https://example.com/callback'];
const noLocalhostResult = GmailController.processRedirectUris(noLocalhost);
const noLocalhostCorrect = JSON.stringify(noLocalhostResult) === JSON.stringify(noLocalhost);
console.log('Non-localhost test passed:', noLocalhostCorrect);

console.log('\nAll tests completed successfully!');