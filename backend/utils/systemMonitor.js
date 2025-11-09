const os = require('os');
const logger = require('./logger');

class SystemMonitor {
  constructor() {
    this.startTime = Date.now();
  }
  
  // Get system information
  getSystemInfo() {
    return {
      platform: os.platform(),
      architecture: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    };
  }
  
  // Get process information
  getProcessInfo() {
    const memoryUsage = process.memoryUsage();
    return {
      pid: process.pid,
      uptime: (Date.now() - this.startTime) / 1000,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      cpuUsage: process.cpuUsage()
    };
  }
  
  // Get application metrics
  getAppMetrics() {
    // In a real application, you would track:
    // - Active users
    // - API request rates
    // - Email sending rates
    // - Database query performance
    // - Error rates
    
    return {
      activeConnections: 0,
      apiRequestsPerMinute: 0,
      emailsSentPerMinute: 0,
      databaseQueriesPerMinute: 0,
      errorRate: 0
    };
  }
  
  // Get health status
  getHealthStatus() {
    const systemInfo = this.getSystemInfo();
    const processInfo = this.getProcessInfo();
    const appMetrics = this.getAppMetrics();
    
    // Simple health check - in production, add more sophisticated checks
    const isHealthy = systemInfo.freeMemory > systemInfo.totalMemory * 0.1; // At least 10% free memory
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      process: processInfo,
      metrics: appMetrics,
      checks: {
        memory: {
          status: systemInfo.freeMemory > systemInfo.totalMemory * 0.05 ? 'ok' : 'warning',
          freeMemory: systemInfo.freeMemory,
          totalMemory: systemInfo.totalMemory,
          usage: ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(2) + '%'
        },
        disk: {
          status: 'ok', // In production, check actual disk space
          message: 'Disk space check not implemented'
        },
        network: {
          status: 'ok',
          message: 'Network connectivity assumed'
        }
      }
    };
  }
  
  // Log health status
  logHealthStatus() {
    const health = this.getHealthStatus();
    logger.info('System health check', health);
    return health;
  }
  
  // Start periodic health monitoring
  startMonitoring(intervalMs = 30000) { // Default 30 seconds
    setInterval(() => {
      this.logHealthStatus();
    }, intervalMs);
    
    logger.info('System monitoring started', { intervalMs });
  }
}

// Singleton instance
const systemMonitor = new SystemMonitor();

module.exports = systemMonitor;