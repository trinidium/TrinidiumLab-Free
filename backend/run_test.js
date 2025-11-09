// Test script to verify the redirect URI fix
const { spawn } = require('child_process');
const path = require('path');

// Create a simple test in memory
const testScript = `
const GmailController = require('./controllers/gmailController');

// Test the processRedirectUris function
console.log('Testing processRedirectUris function...\\n');

// Test case: Array with https://localhost
const test = ['https://localhost', 'http://localhost:3001/api/gmail/callback', 'https://example.com'];
const result = GmailController.processRedirectUris(test);

console.log('Input:', test);
console.log('Output:', result);
console.log('Expected: http://localhost:3001/api/gmail/callback as first and second elements');

// Check if the first element was replaced
const isReplaced = result[0] === 'http://localhost:3001/api/gmail/callback';
const isSecondReplaced = result[1] === 'http://localhost:3001/api/gmail/callback';
const isThirdUnchanged = result[2] === 'https://example.com';

console.log('First element replaced:', isReplaced);
console.log('Second element unchanged (already correct):', isSecondReplaced);
console.log('Third element unchanged:', isThirdUnchanged);
console.log('All tests passed:', isReplaced && isSecondReplaced && isThirdUnchanged);
`;

// Write the test script to a temporary file and run it
const fs = require('fs');
const testFilePath = path.join(__dirname, 'temp_test.js');
fs.writeFileSync(testFilePath, testScript);

// Run the test using Node.js
const child = spawn('node', [testFilePath], { cwd: __dirname });

child.stdout.on('data', (data) => {
    console.log(\`Output: \${data}\`);
});

child.stderr.on('data', (data) => {
    console.error(\`Error: \${data}\`);
});

child.on('close', (code) => {
    console.log(\`Child process exited with code \${code}\`);
    // Clean up the temporary file
    fs.unlinkSync(testFilePath);
});