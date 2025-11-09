// lib/apiClient.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

class ApiClient {
  // Helper to properly join URL parts, removing potential duplicate slashes
  static buildUrl(path: string): string {
    // Remove trailing slash from base URL if present
    const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  // Helper function to handle API responses
  static async handleApiResponse(response: Response, endpoint: string) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, endpoint: ${endpoint}, message: ${errorText}`);
    }
    return response.json();
  }
  // Gmail API
  static async uploadGmailCredentials(credentials: any) {
    const url = this.buildUrl('/api/gmail/credentials');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credentials }),
    });
    return this.handleApiResponse(response, '/api/gmail/credentials');
  }

  static async getGmailAuthUrl() {
    const url = this.buildUrl('/api/gmail/auth');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/gmail/auth');
  }

  static async checkGmailStatus() {
    const url = this.buildUrl('/api/gmail/status');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/gmail/status');
  }

  static async getGmailCredentialsInfo() {
    const url = this.buildUrl('/api/gmail/credentials');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/gmail/credentials');
  }

  static async sendEmail(data: { 
    to: string; 
    subject: string; 
    body: string; 
    variables?: Record<string, string>;
    attachments?: Array<{ filename: string; content: string; encoding: string }>;
    campaignId?: number | null;
  }) {
    const url = this.buildUrl('/api/gmail/send');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/gmail/send');
  }

  static async queueEmail(data: { 
    to: string; 
    subject: string; 
    body: string; 
    variables?: Record<string, string>;
    attachments?: Array<{ filename: string; content: string; encoding: string }>;
    campaignId?: number | null;
    delaySeconds?: number;
    dailyLimit?: number;
  }) {
    const url = this.buildUrl('/api/gmail/queue');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/gmail/queue');
  }

  static async updateGmailSchedulerConfig(data: { 
    delayBetweenEmails?: number; 
    dailyLimit?: number 
  }) {
    const url = this.buildUrl('/api/gmail/scheduler/config');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/gmail/scheduler/config');
  }

  static async sendBulkEmails(data: { 
    recipients: Array<{ name: string; email: string; company?: string }>; 
    subject: string; 
    body: string;
    campaignId?: number;
    attachments?: Array<{ filename: string; content: string; encoding: string }>;
  }) {
    const url = this.buildUrl('/api/gmail/send-bulk');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/gmail/send-bulk');
  }

  static async removeGmailCredentials() {
    const url = this.buildUrl('/api/gmail/credentials');
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return this.handleApiResponse(response, '/api/gmail/credentials');
  }

  // Leads API
  static async getAllLeads() {
    try {
      const url = this.buildUrl('/api/leads');
      const response = await fetch(url);
      return await this.handleApiResponse(response, '/api/leads');
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  static async createLead(data: { name: string; email: string; company?: string }) {
    const url = this.buildUrl('/api/leads');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/leads');
  }

  static async searchLeads(query: string) {
    const url = this.buildUrl(`/api/leads/search?q=${encodeURIComponent(query)}`);
    const response = await fetch(url);
    return this.handleApiResponse(response, `/api/leads/search?q=${query}`);
  }

  static async updateLeadStatus(id: number, status: 'Pending' | 'Sent' | 'Failed') {
    const url = this.buildUrl(`/api/leads/${id}/status`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return this.handleApiResponse(response, `/api/leads/${id}/status`);
  }

  static async deleteLead(id: number) {
    const url = this.buildUrl(`/api/leads/${id}`);
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return this.handleApiResponse(response, `/api/leads/${id}`);
  }

  static async clearLeads() {
    const url = this.buildUrl('/api/leads');
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return this.handleApiResponse(response, '/api/leads');
  }

  static async importLeads(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = this.buildUrl('/api/leads/import');
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    return this.handleApiResponse(response, '/api/leads/import');
  }

  // Campaigns API
  static async getAllCampaigns() {
    const url = this.buildUrl('/api/campaigns');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/campaigns');
  }

  static async createCampaign(data: { 
    name: string; 
    leadIds?: number[]; 
    dailyLimit?: number; 
    delaySeconds?: number 
  }) {
    const url = this.buildUrl('/api/campaigns');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/campaigns');
  }

  static async updateCampaignStatus(id: number, status: 'Draft' | 'Running' | 'Paused' | 'Completed' | 'Stopped') {
    const url = this.buildUrl(`/api/campaigns/${id}/status`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return this.handleApiResponse(response, `/api/campaigns/${id}/status`);
  }

  static async deleteCampaign(id: number) {
    const url = this.buildUrl(`/api/campaigns/${id}`);
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return this.handleApiResponse(response, `/api/campaigns/${id}`);
  }

  static async getCampaignStats(id: number) {
    const url = this.buildUrl(`/api/campaigns/${id}/stats`);
    const response = await fetch(url);
    return this.handleApiResponse(response, `/api/campaigns/${id}/stats`);
  }



  // Scheduler API
  static async getQueueStatus() {
    const url = this.buildUrl('/api/scheduler/status');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/scheduler/status');
  }

  static async getQueueStats() {
    const url = this.buildUrl('/api/scheduler/stats');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/scheduler/stats');
  }

  static async clearQueue() {
    const url = this.buildUrl('/api/scheduler/clear');
    const response = await fetch(url, {
      method: 'POST',
    });
    return this.handleApiResponse(response, '/api/scheduler/clear');
  }

  static async pauseQueue() {
    const url = this.buildUrl('/api/scheduler/pause');
    const response = await fetch(url, {
      method: 'POST',
    });
    return this.handleApiResponse(response, '/api/scheduler/pause');
  }

  static async resumeQueue() {
    const url = this.buildUrl('/api/scheduler/resume');
    const response = await fetch(url, {
      method: 'POST',
    });
    return this.handleApiResponse(response, '/api/scheduler/resume');
  }

  static async saveEmailTemplate(data: { subject: string; body: string }) {
    const url = this.buildUrl('/api/email-templates/save');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/email-templates/save');
  }

  static async getLatestEmailTemplates() {
    const url = this.buildUrl('/api/email-templates/latest');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/email-templates/latest');
  }

  static async updateSchedulerConfig(data: { delayBetweenEmails?: number; dailyLimit?: number }) {
    const url = this.buildUrl('/api/scheduler/config');
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return this.handleApiResponse(response, '/api/scheduler/config');
  }

  // Email Logs API
  static async getEmailLogs(campaignId?: number, excludeTest?: boolean) {
    let url = this.buildUrl('/api/email-logs');
    const params = [];
    
    if (campaignId) {
      params.push(`campaignId=${campaignId}`);
    }
    
    if (excludeTest !== undefined) {
      params.push(`excludeTest=${excludeTest}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await fetch(url);
    return this.handleApiResponse(response, url);
  }

  // Get campaign email stats (excluding test emails)
  static async getCampaignEmailStats() {
    const url = this.buildUrl('/api/email-logs/campaign-stats');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/api/email-logs/campaign-stats');
  }

  static async downloadEmailLogs(type: 'success' | 'error', campaignId?: number) {
    const url = campaignId 
      ? this.buildUrl(`/api/email-logs/download/${type}?campaignId=${campaignId}`)
      : this.buildUrl(`/api/email-logs/download/${type}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, endpoint: ${url}, message: ${errorText}`);
    }
    return response.blob();
  }

  // Health check
  static async healthCheck() {
    const url = this.buildUrl('/health');
    const response = await fetch(url);
    return this.handleApiResponse(response, '/health');
  }


}

export default ApiClient;