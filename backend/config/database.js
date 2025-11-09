const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbPath = process.env.DB_PATH || './database.sqlite';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

// Initialize tables
function initializeTables() {
  // Create credentials table
  db.run(`CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    client_id TEXT,
    client_secret TEXT,
    project_id TEXT,
    auth_uri TEXT,
    token_uri TEXT,
    auth_provider_x509_cert_url TEXT,
    redirect_uris TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating credentials table:', err.message);
    } else {
      console.log('Credentials table ready');
    }
  });

  // Create leads table
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email)
  )`, (err) => {
    if (err) {
      console.error('Error creating leads table:', err.message);
    } else {
      console.log('Leads table ready');
      
      // Create index on email for faster lookups
      db.run(`CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)`, (err) => {
        if (err) {
          console.error('Error creating index on leads.email:', err.message);
        }
      });
      
      // Create index on status for faster filtering
      db.run(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`, (err) => {
        if (err) {
          console.error('Error creating index on leads.status:', err.message);
        }
      });
      
      // Check if campaign_id column exists and add it if it doesn't exist
      ensureCampaignIdColumnExists();
    }
  });

  // Create campaigns table with all fields
  const createCampaignsTable = `CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Draft',
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 100,
    delay_seconds INTEGER DEFAULT 10,
    last_sent_index INTEGER DEFAULT 0,
    daily_sent_count INTEGER DEFAULT 0,
    daily_sent_reset_date TEXT, -- Stores date in YYYY-MM-DD format for daily reset
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.serialize(() => {
    db.run(createCampaignsTable, (err) => {
      if (err) {
        console.error('Error creating campaigns table:', err.message);
      } else {
        console.log('Campaigns table ready');
        
        // Check and add new columns if they don't exist
        db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='campaigns'`, (err, row) => {
          if (err) {
            console.error('Error checking campaigns table structure:', err.message);
          } else if (row) {
            const tableSql = row.sql;
            let addLastSentIndex = !tableSql.includes('last_sent_index');
            let addDailySentCount = !tableSql.includes('daily_sent_count');
            let addDailySentResetDate = !tableSql.includes('daily_sent_reset_date');

            if (addLastSentIndex) {
              db.run(`ALTER TABLE campaigns ADD COLUMN last_sent_index INTEGER DEFAULT 0`, (err) => {
                if (err) {
                  console.error('Error adding last_sent_index column:', err.message);
                } else {
                  console.log('Added last_sent_index column to campaigns table');
                }
              });
            }
            
            if (addDailySentCount) {
              db.run(`ALTER TABLE campaigns ADD COLUMN daily_sent_count INTEGER DEFAULT 0`, (err) => {
                if (err) {
                  console.error('Error adding daily_sent_count column:', err.message);
                } else {
                  console.log('Added daily_sent_count column to campaigns table');
                }
              });
            }
            
            if (addDailySentResetDate) {
              db.run(`ALTER TABLE campaigns ADD COLUMN daily_sent_reset_date TEXT`, (err) => {
                if (err) {
                  console.error('Error adding daily_sent_reset_date column:', err.message);
                } else {
                  console.log('Added daily_sent_reset_date column to campaigns table');
                }
              });
            }
          }
        });
      }
    });
  });

  // Create email_templates table
  db.run(`CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    subject TEXT,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating email_templates table:', err.message);
    } else {
      console.log('Email templates table ready');
      
      // Create index on campaign_id for faster lookups
      db.run(`CREATE INDEX IF NOT EXISTS idx_templates_campaign ON email_templates(campaign_id)`, (err) => {
        if (err) {
          console.error('Error creating index on email_templates.campaign_id:', err.message);
        }
      });
    }
  });

  // Create email_logs table with all fields
  const createEmailLogsTable = `CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    campaign_id INTEGER,
    template_id INTEGER,
    status TEXT, -- Sent, Failed
    error_message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_type TEXT DEFAULT 'main',
    FOREIGN KEY (lead_id) REFERENCES leads (id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
    FOREIGN KEY (template_id) REFERENCES email_templates (id)
  )`;

  db.serialize(() => {
    db.run(createEmailLogsTable, (err) => {
      if (err) {
        console.error('Error creating email_logs table:', err.message);
      } else {
        console.log('Email logs table ready');
        
        // Set up indexes after potential column additions
        setTimeout(() => {
          // Create index on lead_id for faster lookups
          db.run(`CREATE INDEX IF NOT EXISTS idx_logs_lead ON email_logs(lead_id)`, (err) => {
            if (err) {
              console.error('Error creating index on email_logs.lead_id:', err.message);
            }
          });

          // Create index on campaign_id for faster lookups
          db.run(`CREATE INDEX IF NOT EXISTS idx_logs_campaign ON email_logs(campaign_id)`, (err) => {
            if (err) {
              console.error('Error creating index on email_logs.campaign_id:', err.message);
            }
          });

          // Create index on status for faster filtering
          db.run(`CREATE INDEX IF NOT EXISTS idx_logs_status ON email_logs(status)`, (err) => {
            if (err) {
              console.error('Error creating index on email_logs.status:', err.message);
            }
          });

          // Create index on sent_at for faster date filtering
          db.run(`CREATE INDEX IF NOT EXISTS idx_logs_sent_at ON email_logs(sent_at)`, (err) => {
            if (err) {
              console.error('Error creating index on email_logs.sent_at:', err.message);
            }
          });

          // Create index on email_type for faster filtering
          db.run(`CREATE INDEX IF NOT EXISTS idx_logs_email_type ON email_logs(email_type)`, (err) => {
            if (err) {
              console.error('Error creating index on email_logs.email_type:', err.message);
            }
          });
        }, 100); // Delay index creation to allow column additions to complete
      }
    });
  });

  // Create scheduled_emails table
  db.run(`CREATE TABLE IF NOT EXISTS scheduled_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    campaign_id INTEGER,
    template_id INTEGER,
    subject TEXT,
    body TEXT,
    variables TEXT, -- JSON string
    attachments TEXT, -- JSON string
    scheduled_time DATETIME,
    status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads (id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
    FOREIGN KEY (template_id) REFERENCES email_templates (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating scheduled_emails table:', err.message);
    } else {
      console.log('Scheduled emails table ready');
      
      // Create indexes for scheduled emails table
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_time ON scheduled_emails(status, scheduled_time)`, (err) => {
        if (err) {
          console.error('Error creating index on scheduled_emails(status, scheduled_time):', err.message);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign ON scheduled_emails(campaign_id)`, (err) => {
        if (err) {
          console.error('Error creating index on scheduled_emails.campaign_id:', err.message);
        }
      });
    }
  });
}

// Function to safely add campaign_id column to leads table if it doesn't exist
function ensureCampaignIdColumnExists() {
  // Check if the column exists using PRAGMA table_info
  const checkColumnQuery = `
    SELECT name 
    FROM pragma_table_info('leads') 
    WHERE name = 'campaign_id'
  `;
  
  db.get(checkColumnQuery, [], (err, row) => {
    if (err) {
      console.error('Error checking for campaign_id column:', err.message);
      return;
    }
    
    // If no row is returned, the column doesn't exist
    if (!row) {
      // Add the column since it doesn't exist
      const addColumnQuery = `
        ALTER TABLE leads 
        ADD COLUMN campaign_id INTEGER
      `;
      
      db.run(addColumnQuery, (err) => {
        if (err) {
          console.error('Error adding campaign_id column to leads table:', err.message);
        } else {
          console.log('Successfully added campaign_id column to leads table.');
          
          // Create an index on the new column for better performance
          db.run(`CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id)`, (err) => {
            if (err) {
              console.error('Error creating index on leads.campaign_id:', err.message);
            } else {
              console.log('Index created on leads.campaign_id');
            }
          });
        }
      });
    } else {
      console.log('campaign_id column already exists in leads table.');
    }
  });
}

module.exports = db;