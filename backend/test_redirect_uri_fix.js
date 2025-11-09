// Test script to verify the redirect URI fix
const GmailController = require('./controllers/gmailController');

// Test cases for the processRedirectUris function
console.log('Testing processRedirectUris function...\n');

// Test case 1: Array with https://localhost
const test1 = ['https://localhost', 'http://localhost:3001/api/gmail/callback', 'https://example.com'];
const result1 = GmailController.processRedirectUris(test1);
console.log('Test 1 - Input:', test1);
console.log('Test 1 - Output:', result1);
console.log('Test 1 - Expected: ["http://localhost:3001/api/gmail/callback", "http://localhost:3001/api/gmail/callback", "https://example.com"]');
console.log('Test 1 - Pass:', JSON.stringify(result1) === JSON.stringify(['http://localhost:3001/api/gmail/callback', 'http://localhost:3001/api/gmail/callback', 'https://example.com']));
console.log();

// Test case 2: Array with various localhost variations
const test2 = ['https://localhost/callback', 'https://localhost:8080', 'http://localhost:3000/auth'];
const result2 = GmailController.processRedirectUris(test2);
console.log('Test 2 - Input:', test2);
console.log('Test 2 - Output:', result2);
console.log('Test 2 - Expected: ["http://localhost:3001/api/gmail/callback", "http://localhost:3001/api/gmail/callback", "http://localhost:3000/auth"]');
console.log('Test 2 - Pass:', JSON.stringify(result2) === JSON.stringify(['http://localhost:3001/api/gmail/callback', 'http://localhost:3001/api/gmail/callback', 'http://localhost:3000/auth']));
console.log();

// Test case 3: Array without localhost
const test3 = ['https://example.com', 'https://google.com/auth', 'http://localhost:3000/auth'];
const result3 = GmailController.processRedirectUris(test3);
console.log('Test 3 - Input:', test3);
console.log('Test 3 - Output:', result3);
console.log('Test 3 - Expected: ["https://example.com", "https://google.com/auth", "http://localhost:3000/auth"]');
console.log('Test 3 - Pass:', JSON.stringify(result3) === JSON.stringify(['https://example.com', 'https://google.com/auth', 'http://localhost:3000/auth']));
console.log();

// Test case 4: Empty array
const test4 = [];
const result4 = GmailController.processRedirectUris(test4);
console.log('Test 4 - Input:', test4);
console.log('Test 4 - Output:', result4);
console.log('Test 4 - Expected: []');
console.log('Test 4 - Pass:', JSON.stringify(result4) === JSON.stringify([]));
console.log();

// Test case 5: Null/undefined
const test5 = null;
const result5 = GmailController.processRedirectUris(test5);
console.log('Test 5 - Input:', test5);
console.log('Test 5 - Output:', result5);
console.log('Test 5 - Expected: []');
console.log('Test 5 - Pass:', JSON.stringify(result5) === JSON.stringify([]));
console.log();

// Test case 6: Non-array input
const test6 = 'https://localhost';
const result6 = GmailController.processRedirectUris(test6);
console.log('Test 6 - Input:', test6);
console.log('Test 6 - Output:', result6);
console.log('Test 6 - Expected: []');
console.log('Test 6 - Pass:', JSON.stringify(result6) === JSON.stringify([]));
console.log();

console.log('All tests completed!');
