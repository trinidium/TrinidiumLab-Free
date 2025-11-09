const emailScheduler = require('../utils/emailScheduler');
const logger = require('../utils/logger');

class SchedulerController {
  // Get queue status
  static async getQueueStatus(req, res) {
    try {
      const status = emailScheduler.getQueueStatus();
      logger.info('Queue status requested');
      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Get queue status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Get queue statistics
  static async getQueueStats(req, res) {
    try {
      const stats = emailScheduler.getQueueStats();
      logger.info('Queue stats requested');
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get queue stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Clear queue
  static async clearQueue(req, res) {
    try {
      const clearedCount = emailScheduler.clearQueue();
      logger.info('Queue cleared', { clearedCount });
      res.json({ 
        success: true, 
        message: `Cleared ${clearedCount} emails from queue`,
        clearedCount 
      });
    } catch (error) {
      logger.error('Clear queue error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  

  
  // Update scheduler configuration
  static async updateConfiguration(req, res) {
    try {
      const { delayBetweenEmails, dailyLimit } = req.body;
      
      if (delayBetweenEmails !== undefined) {
        emailScheduler.setDelay(delayBetweenEmails);
        logger.info('Email delay updated', { delayBetweenEmails });
      }
      
      if (dailyLimit !== undefined) {
        emailScheduler.setDailyLimit(dailyLimit);
        logger.info('Daily limit updated', { dailyLimit });
      }
      
      res.json({ 
        success: true, 
        message: 'Scheduler configuration updated',
        data: {
          delayBetweenEmails: delayBetweenEmails !== undefined ? delayBetweenEmails : 'unchanged',
          dailyLimit: dailyLimit !== undefined ? dailyLimit : 'unchanged'
        }
      });
    } catch (error) {
      logger.error('Update configuration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = SchedulerController;