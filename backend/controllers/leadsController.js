const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const csv = require('csv-parser');

class LeadsController {
  // Get all leads
  static async getAllLeads(req, res) {
    try {
      db.all('SELECT * FROM leads ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          logger.error('Database error fetching leads:', err);
          return res.status(500).json({ error: 'Failed to fetch leads' });
        }
        
        res.json({ success: true, data: rows });
      });
    } catch (error) {
      logger.error('Get all leads error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Create a new lead
  static async createLead(req, res) {
    try {
      const { name, email, company } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      const stmt = db.prepare(`
        INSERT INTO leads (name, email, company, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(name, email, company || null, function(err) {
        if (err) {
          logger.error('Database error creating lead:', err);
          return res.status(500).json({ error: 'Failed to create lead' });
        }
        
        const newLead = {
          id: this.lastID,
          name,
          email,
          company: company || null,
          status: 'Pending',
          created_at: new Date().toISOString()
        };
        
        logger.info('Lead created successfully', { leadId: this.lastID });
        res.status(201).json({ success: true, data: newLead });
      });
      
      stmt.finalize();
    } catch (error) {
      logger.error('Create lead error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Delete a lead
  static async deleteLead(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }
      
      db.run('DELETE FROM leads WHERE id = ?', [id], function(err) {
        if (err) {
          logger.error('Database error deleting lead:', err);
          return res.status(500).json({ error: 'Failed to delete lead' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        
        logger.info('Lead deleted successfully', { leadId: id });
        res.json({ success: true, message: 'Lead deleted successfully' });
      });
    } catch (error) {
      logger.error('Delete lead error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Import leads from CSV with robust parsing
  static async importLeads(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
      }
      
      const filePath = req.file.path;
      const results = [];
      
      // Use csv-parser for robust CSV parsing
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
      
      if (results.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'CSV file must contain at least one lead' });
      }
      
      // Find the email column (case-insensitive with fuzzy matching)
      const firstRow = results[0];
      const headers = Object.keys(firstRow);
      
      // Find headers with case-insensitive matching and fuzzy matching for common typos
      let emailHeader = null;
      let nameHeader = null;
      let companyHeader = null;
      
      for (const header of headers) {
        const lowerHeader = header.toLowerCase();
        // Exact matches (case-insensitive)
        if (lowerHeader === 'email') emailHeader = header;
        if (lowerHeader === 'name') nameHeader = header;
        if (lowerHeader === 'company') companyHeader = header;
        
        // Fuzzy matching for common typos/variations (case-insensitive)
        if (!emailHeader && (lowerHeader.includes('email') || lowerHeader.includes('e-mail'))) emailHeader = header;
        if (!nameHeader && lowerHeader.includes('name')) nameHeader = header;
        if (!companyHeader && (lowerHeader.includes('company') || lowerHeader.includes('comapny') || 
            lowerHeader.includes('organization') || lowerHeader.includes('org') || 
            lowerHeader.includes('comp') || lowerHeader.includes('campany'))) companyHeader = header;
      }
      
      // Must have email column
      if (!emailHeader) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          error: 'CSV must contain an email column. Supported column names: email, Email, EMAIL, e-mail, etc. (case-insensitive)' 
        });
      }
      
      // Parse leads with proper validation
      const leads = [];
      for (const row of results) {
        const email = row[emailHeader]?.toString().trim();
        
        // Skip rows without email
        if (!email) continue;
        
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
        
        const name = nameHeader ? (row[nameHeader]?.toString().trim() || '') : '';
        const company = companyHeader ? (row[companyHeader]?.toString().trim() || null) : null;
        
        leads.push({ name, email, company });
      }
      
      if (leads.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          error: 'No valid leads found in CSV file. Please ensure your CSV contains an email column with valid email addresses.' 
        });
      }
      
      // Insert leads into database
      const stmt = db.prepare(`
        INSERT INTO leads (name, email, company, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      let insertedCount = 0;
      let duplicateCount = 0;
      
      leads.forEach(lead => {
        stmt.run(lead.name, lead.email, lead.company || null, function(err) {
          if (err) {
            // Check if it's a duplicate entry error
            if (err.message.includes('UNIQUE constraint failed')) {
              duplicateCount++;
            } else {
              logger.error('Database error inserting lead:', err);
            }
          } else {
            insertedCount++;
          }
          
          // If this is the last lead, send response
          if (insertedCount + duplicateCount === leads.length) {
            stmt.finalize();
            fs.unlinkSync(filePath);
            
            logger.info('CSV leads import completed', { 
              imported: insertedCount, 
              duplicates: duplicateCount, 
              total: leads.length 
            });
            
            res.json({ 
              success: true, 
              message: `Successfully imported ${insertedCount} leads (${duplicateCount} duplicates skipped)`,
              data: { imported: insertedCount, duplicates: duplicateCount, total: leads.length }
            });
          }
        });
      });
    } catch (error) {
      logger.error('Import leads error:', error);
      // Clean up file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to import leads: ' + error.message });
    }
  }
  
  // Clear all leads
  static async clearLeads(req, res) {
    try {
      db.run('DELETE FROM leads', function(err) {
        if (err) {
          logger.error('Database error clearing leads:', err);
          return res.status(500).json({ error: 'Failed to clear leads' });
        }
        
        logger.info('All leads cleared successfully', { count: this.changes });
        res.json({ success: true, message: `Cleared ${this.changes} leads` });
      });
    } catch (error) {
      logger.error('Clear leads error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Update lead status
  static async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }
      
      if (!status || !['Pending', 'Sent', 'Failed'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }
      
      db.run('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [status, id], 
        function(err) {
          if (err) {
            logger.error('Database error updating lead status:', err);
            return res.status(500).json({ error: 'Failed to update lead' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Lead not found' });
          }
          
          logger.info('Lead status updated', { leadId: id, status });
          res.json({ success: true, message: 'Lead status updated successfully' });
        }
      );
    } catch (error) {
      logger.error('Update lead status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Search leads
  static async searchLeads(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const searchQuery = `%${q}%`;
      db.all(`
        SELECT * FROM leads 
        WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
        ORDER BY created_at DESC
      `, [searchQuery, searchQuery, searchQuery], (err, rows) => {
        if (err) {
          logger.error('Database error searching leads:', err);
          return res.status(500).json({ error: 'Failed to search leads' });
        }
        
        res.json({ success: true, data: rows, query: q });
      });
    } catch (error) {
      logger.error('Search leads error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = LeadsController;