const fs = require('fs');
const path = require('path');
const SecurityUtil = require('./securityUtil');
const logger = require('./logger');

class TokenStorage {
  constructor() {
    this.storagePath = path.join(__dirname, '../secure-storage');
    this.ensureStorageDirectory();
  }
  
  // Ensure storage directory exists
  ensureStorageDirectory() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      // Set restrictive permissions (read/write for owner only)
      fs.chmodSync(this.storagePath, 0o700);
    }
  }
  
  // Save token securely
  saveToken(userId, tokenData) {
    try {
      const filename = `${userId}.token`;
      const filepath = path.join(this.storagePath, filename);
      
      // Ensure directory exists
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        fs.chmodSync(this.storagePath, 0o700);
      }
      
      // Encrypt token data before saving
      const encryptedData = SecurityUtil.encrypt(JSON.stringify(tokenData));
      
      if (!encryptedData) {
        throw new Error('Failed to encrypt token data');
      }
      
      // Save encrypted data
      fs.writeFileSync(filepath, JSON.stringify(encryptedData), { mode: 0o600 });
      
      logger.info('Token saved securely', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to save token', { userId, error: error.message, stack: error.stack });
      return false;
    }
  }
  
  // Load token securely
  loadToken(userId) {
    try {
      const filename = `${userId}.token`;
      const filepath = path.join(this.storagePath, filename);
      
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        logger.warn('Token file not found', { userId });
        return null;
      }
      
      // Read encrypted data
      const encryptedContent = fs.readFileSync(filepath, 'utf8');
      const encryptedData = JSON.parse(encryptedContent);
      
      // Decrypt token data
      const decryptedData = SecurityUtil.decrypt(
        encryptedData.encryptedData,
        encryptedData.iv
      );
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt token data');
      }
      
      const tokenData = JSON.parse(decryptedData);
      
      // For persistent authentication, don't remove the token even if expired
      // The refresh mechanism will handle expired tokens when they're used
      if (tokenData.expiry && new Date(tokenData.expiry) < new Date()) {
        logger.info('Token expired, but keeping for refresh', { userId });
        // Don't delete the token, return it anyway for refresh handling
      }
      
      logger.info('Token loaded securely', { userId });
      return tokenData;
    } catch (error) {
      logger.error('Failed to load token', { userId, error: error.message });
      return null;
    }
  }
  
  // Delete token
  deleteToken(userId) {
    try {
      const filename = `${userId}.token`;
      const filepath = path.join(this.storagePath, filename);
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info('Token deleted', { userId });
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to delete token', { userId, error: error.message });
      return false;
    }
  }
  
  // List all tokens (for admin purposes)
  listTokens() {
    try {
      const files = fs.readdirSync(this.storagePath);
      const tokens = files
        .filter(file => file.endsWith('.token'))
        .map(file => file.replace('.token', ''));
      
      logger.info('Token list retrieved', { count: tokens.length });
      return tokens;
    } catch (error) {
      logger.error('Failed to list tokens', { error: error.message });
      return [];
    }
  }
}

// Singleton instance
const tokenStorage = new TokenStorage();

module.exports = tokenStorage;