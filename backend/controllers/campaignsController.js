const db = require('../config/database');

class CampaignsController {
  // Get all campaigns
  static async getAllCampaigns(req, res) {
    try {
      db.all('SELECT * FROM campaigns ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to fetch campaigns' });
        }
        
        res.json({ success: true, data: rows });
      });
    } catch (error) {
      console.error('Get all campaigns error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Create a new campaign
  static async createCampaign(req, res) {
    try {
      const { name, leadIds, dailyLimit, delaySeconds } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Campaign name is required' });
      }
      
      const stmt = db.prepare(`
        INSERT INTO campaigns 
        (name, status, total_leads, daily_limit, delay_seconds, last_sent_index, daily_sent_count, daily_sent_reset_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, DATE('now'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      const totalLeads = Array.isArray(leadIds) ? leadIds.length : 0;
      const limit = dailyLimit || 100;
      const delay = delaySeconds || 10;
      
      stmt.run(name, 'Draft', totalLeads, limit, delay, function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create campaign' });
        }
        
        const newCampaign = {
          id: this.lastID,
          name,
          status: 'Draft',
          total_leads: totalLeads,
          sent_count: 0,
          failed_count: 0,
          daily_limit: limit,
          delay_seconds: delay,
          last_sent_index: 0,
          daily_sent_count: 0,
          daily_sent_reset_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        
        res.status(201).json({ success: true, data: newCampaign });
      });
      
      stmt.finalize();
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Update campaign status
  static async updateCampaignStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      if (!status || !['Draft', 'Running', 'Completed', 'Stopped'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }
      
      db.run('UPDATE campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [status, id], 
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update campaign' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
          }
          
          res.json({ success: true, message: 'Campaign updated successfully' });
        }
      );
    } catch (error) {
      console.error('Update campaign status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Delete a campaign
  static async deleteCampaign(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      // First delete associated email templates
      db.run('DELETE FROM email_templates WHERE campaign_id = ?', [id], (err) => {
        if (err) {
          console.error('Database error deleting templates:', err);
          return res.status(500).json({ error: 'Failed to delete campaign templates' });
        }
        
        // Then delete the campaign
        db.run('DELETE FROM campaigns WHERE id = ?', [id], function(err) {
          if (err) {
            console.error('Database error deleting campaign:', err);
            return res.status(500).json({ error: 'Failed to delete campaign' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
          }
          
          res.json({ success: true, message: 'Campaign deleted successfully' });
        });
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Get campaign statistics
  static async getCampaignStats(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      db.get(`
        SELECT c.*, 
               COUNT(l.id) as total_leads,
               SUM(CASE WHEN l.status = 'Sent' THEN 1 ELSE 0 END) as sent_count,
               SUM(CASE WHEN l.status = 'Failed' THEN 1 ELSE 0 END) as failed_count
        FROM campaigns c
        LEFT JOIN leads l ON l.campaign_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to fetch campaign stats' });
        }
        
        if (!row) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
        
        res.json({ success: true, data: row });
      });
    } catch (error) {
      console.error('Get campaign stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Reset daily sent count for a campaign
  static async resetDailyCount(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      db.run('UPDATE campaigns SET daily_sent_count = 0, daily_sent_reset_date = DATE("now"), updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [id], 
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to reset daily count' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
          }
          
          res.json({ success: true, message: 'Daily count reset successfully' });
        }
      );
    } catch (error) {
      console.error('Reset daily count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Update campaign last sent index
  static async updateLastSentIndex(req, res) {
    try {
      const { id } = req.params;
      const { index } = req.body;
      
      if (!id || index === undefined) {
        return res.status(400).json({ error: 'Campaign ID and index are required' });
      }
      
      db.run('UPDATE campaigns SET last_sent_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [index, id], 
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update last sent index' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
          }
          
          res.json({ success: true, message: 'Last sent index updated successfully' });
        }
      );
    } catch (error) {
      console.error('Update last sent index error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Increment daily sent count for a campaign
  static async incrementDailySentCount(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      // First check if we need to reset the daily count
      db.get('SELECT daily_sent_count, daily_sent_reset_date FROM campaigns WHERE id = ?', [id], (err, campaign) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to get campaign data' });
        }
        
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Check if we need to reset the daily counter
        if (campaign.daily_sent_reset_date !== today) {
          // Reset daily count if date has changed
          db.run('UPDATE campaigns SET daily_sent_count = 1, daily_sent_reset_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [today, id], 
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to increment daily count' });
              }
              
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Campaign not found' });
              }
              
              res.json({ 
                success: true, 
                message: 'Daily count incremented successfully', 
                daily_sent_count: 1,
                daily_sent_reset_date: today
              });
            }
          );
        } else {
          // Increment daily count for today
          db.run('UPDATE campaigns SET daily_sent_count = daily_sent_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [id], 
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to increment daily count' });
              }
              
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Campaign not found' });
              }
              
              // Get the updated count to return
              db.get('SELECT daily_sent_count, daily_sent_reset_date FROM campaigns WHERE id = ?', [id], (err, updatedCampaign) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Failed to get updated campaign data' });
                }
                
                res.json({ 
                  success: true, 
                  message: 'Daily count incremented successfully', 
                  daily_sent_count: updatedCampaign.daily_sent_count,
                  daily_sent_reset_date: updatedCampaign.daily_sent_reset_date
                });
              });
            }
          );
        }
      });
    } catch (error) {
      console.error('Increment daily sent count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Check if daily limit is reached for a campaign
  static async checkDailyLimit(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }
      
      db.get(`
        SELECT c.daily_limit, c.daily_sent_count, c.daily_sent_reset_date
        FROM campaigns c
        WHERE c.id = ?
      `, [id], (err, campaign) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to check daily limit' });
        }
        
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        let currentCount = campaign.daily_sent_count;
        
        // Reset count if date has changed
        if (campaign.daily_sent_reset_date !== today) {
          currentCount = 0;
        }
        
        const isLimitReached = currentCount >= campaign.daily_limit;
        
        res.json({ 
          success: true, 
          isLimitReached,
          dailyLimit: campaign.daily_limit,
          dailySentCount: currentCount,
          dailySentResetDate: campaign.daily_sent_reset_date,
          remaining: Math.max(0, campaign.daily_limit - currentCount)
        });
      });
    } catch (error) {
      console.error('Check daily limit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = CampaignsController;