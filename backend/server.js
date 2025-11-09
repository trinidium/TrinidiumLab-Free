const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 3001;

// Import middleware
const { securityHeaders, requestLogger, errorHandler, rateLimiter } = require('./middleware/auth');

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://accounts.google.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware
app.use(securityHeaders);
app.use(rateLimiter);
app.use(requestLogger);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database initialization
const db = require('./config/database');

// Routes
const gmailRoutes = require('./routes/gmail');
const leadsRoutes = require('./routes/leads');
const campaignsRoutes = require('./routes/campaigns');
const schedulerRoutes = require('./routes/scheduler');
const emailLogsRoutes = require('./routes/emailLogs');
const emailTemplatesRoutes = require('./routes/emailTemplates');
const scheduledEmailsRoutes = require('./routes/scheduledEmails');

app.use('/api/gmail', gmailRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/email-logs', emailLogsRoutes);
app.use('/api/email-templates', emailTemplatesRoutes);
app.use('/api/scheduled-emails', scheduledEmailsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start system monitoring
  const systemMonitor = require('./utils/systemMonitor');
  systemMonitor.startMonitoring(60000); // Check every minute
});

module.exports = app;