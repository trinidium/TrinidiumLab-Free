const crypto = require('crypto');
const logger = require('./logger');

class SecurityUtil {
  // Encrypt sensitive data
  static encrypt(text, secretKey = process.env.ENCRYPTION_KEY) {
    if (!secretKey) {
      logger.warn('No encryption key provided, using default');
      secretKey = 'default_key_change_in_production';
    }
    
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(secretKey, 'GfG', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      return null;
    }
  }
  
  // Decrypt sensitive data
  static decrypt(encryptedData, iv, secretKey = process.env.ENCRYPTION_KEY) {
    if (!secretKey) {
      logger.warn('No encryption key provided, using default');
      secretKey = 'default_key_change_in_production';
    }
    
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(secretKey, 'GfG', 32);
      const ivBuffer = Buffer.from(iv, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      return null;
    }
  }
  
  // Hash data
  static hash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }
  
  // Generate random token
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Generate secure random string
  static generateRandomString(length = 16) {
    return crypto.randomBytes(length).toString('base64');
  }
  
  // Validate email format
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Validate password strength
  static validatePassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
  
  // Sanitize input to prevent XSS
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  // Sanitize URL
  static sanitizeUrl(url) {
    try {
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (['http:', 'https:'].includes(parsedUrl.protocol)) {
        return parsedUrl.toString();
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = SecurityUtil;