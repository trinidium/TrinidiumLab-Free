"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import {
  Users,
  Mail,
  TrendingUp,
  Clock,
  Upload,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  SettingsIcon,
  Shield,
  Plus,
  Minus,
  Play,
  Pause,
  Square,
  TestTube,
  Download,
} from "lucide-react"
import { useAppState, type Lead } from "@/lib/app-state"
import { useState, useRef } from "react"
import { RichTextEditor } from "./rich-text-editor-improved"
import { AlertMessageDialog } from "./alert-message-dialog"
import { StartCampaignDialog } from "./start-campaign-dialog"
import { GmailRemoveDialog } from "./gmail-remove-dialog"

export function DashboardContent() {
  const {
    activeSection,
    setActiveSection,
    leads,
    setLeads,
    clearLeads,
    logs,
    clearLogs,
    searchQuery,
    settings,
    setSetting,
    resetApp,
    addLog,
    refreshLeads,
  } = useAppState()

  const [isSending, setIsSending] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)
  const [isCampaignCompleted, setIsCampaignCompleted] = React.useState(false)
  const [showStartCampaignDialog, setShowStartCampaignDialog] = React.useState(false)
  const [emailStats, setEmailStats] = React.useState({ sent: 0, failed: 0, total: 0 })
  const [campaignStats, setCampaignStats] = React.useState<any>(null)

  // Track the pending leads that need to be processed
  const pendingLeadsRef = React.useRef<any[]>([]);
  const currentIndexRef = React.useRef(0);
  const processNextLeadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Function to handle pause
  const handlePauseCampaign = () => {
    if (isSending && !isPaused) {
      setIsPaused(true);
      toast({
        title: "Campaign Paused",
        description: "Email sending has been paused. You can resume the campaign when ready.",
      });
    }
  };

  // Function to handle resume
  const handleResumeCampaign = () => {
    if (isSending && isPaused) {
      setIsPaused(false);
      toast({
        title: "Campaign Resumed",
        description: "Email sending has resumed.",
      });
    }
  };

  // Test email functionality
  const [testEmailInput, setTestEmailInput] = React.useState(() => {
    // Load saved email from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("trinidiumlab:test-email-input") || "";
    }
    return "";
  });
  const [showTestEmailAlert, setShowTestEmailAlert] = React.useState(false);
  const [testEmailAlert, setTestEmailAlert] = React.useState({ title: "", message: "", type: "success" as "success" | "error" });
  
  // Reset application confirmation
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  // Gmail remove confirmation
  const [showGmailRemoveConfirm, setShowGmailRemoveConfirm] = React.useState(false);

  // Template mode editor
  const [subject, setSubject] = React.useState("")
  const [templateBody, setTemplateBody] = React.useState("")
  const isClearingTemplateRef = useRef(false)
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const [lastFocused, setLastFocused] = React.useState<"subject" | "body">("body")



  // Sending engine config
  const [delaySeconds, setDelaySeconds] = React.useState<number>(10)
  const [dailyLimit, setDailyLimit] = React.useState<number>(200)

  const [gmailCredentials, setGmailCredentials] = React.useState<any | null>(null)
  const [gmailAuthStatus, setGmailAuthStatus] = React.useState<{
    authenticated: boolean;
    hasCredentials: boolean;
  } | null>(null)

  const [credentialsPreview, setCredentialsPreview] = React.useState<{
    client_id?: string
    project_id?: string
    auth_uri?: string
  } | null>(() => {
    // Load saved credentials preview from localStorage if available
    if (typeof window !== "undefined") {
      const savedPreview = localStorage.getItem("trinidiumlab:credentials-preview");
      return savedPreview ? JSON.parse(savedPreview) : null;
    }
    return null;
  })

  const [isAuthenticating, setIsAuthenticating] = React.useState(false)

  const gmailJsonInputRef = useRef<HTMLInputElement | null>(null)

  // refs to avoid stale closures in timers
  const isSendingRef = useRef(isSending)
  const isPausedRef = useRef(isPaused)
  const leadsRef = useRef(leads)
  const delayRef = useRef(delaySeconds)
  const limitRef = useRef(dailyLimit)
  React.useEffect(() => {
    isSendingRef.current = isSending
  }, [isSending])
  React.useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])
  React.useEffect(() => {
    leadsRef.current = leads
  }, [leads])
  React.useEffect(() => {
    delayRef.current = delaySeconds
  }, [delaySeconds])
  React.useEffect(() => {
    limitRef.current = dailyLimit
  }, [dailyLimit])

  // Periodically refresh leads data for real-time dashboard updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshLeads()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [refreshLeads])

  // Periodically refresh email stats
  React.useEffect(() => {
    const fetchEmailStats = async () => {
      try {
        const response = await import("@/lib/apiClient").then(module => module.default.getEmailLogs(undefined, true)) // exclude test emails
        if (response.success) {
          const logs = response.data
          const sent = logs.filter((log: any) => log.status === 'Sent').length
          const failed = logs.filter((log: any) => log.status === 'Failed').length
          setEmailStats({ sent, failed, total: sent + failed })
        }
      } catch (error) {
        console.error('Failed to fetch email stats:', error)
      }
    }

    fetchEmailStats()
    const interval = setInterval(fetchEmailStats, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Periodically refresh campaign stats
  React.useEffect(() => {
    const fetchCampaignStats = async () => {
      try {
        // For now, we'll fetch stats for the most recent campaign
        // In a real implementation, you might want to allow users to select a campaign
        const campaignsResponse = await import("@/lib/apiClient").then(module => module.default.getAllCampaigns())
        if (campaignsResponse.success && campaignsResponse.data.length > 0) {
          const latestCampaign = campaignsResponse.data[0]
          const statsResponse = await import("@/lib/apiClient").then(module => module.default.getCampaignStats(latestCampaign.id))
          if (statsResponse.success) {
            setCampaignStats(statsResponse.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch campaign stats:', error)
      }
    }

    fetchCampaignStats()
    const interval = setInterval(fetchCampaignStats, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Auto-save template when enabled and values change
  React.useEffect(() => {
    // Don't auto-save if we're currently clearing the template
    if (settings.autoSaveTemplates && activeSection === "email" && !isClearingTemplateRef.current) {
      const autoSaveTimer = setTimeout(() => {

        
        // For auto-save, save main template only (no followups)
        const savePromise = Promise.resolve().then(async () => {
          return import("@/lib/apiClient").then(module => 
            module.default.saveEmailTemplate({
              subject: subject,
              body: templateBody,
            })
          );
        });
        
        // Save the current template to backend
        savePromise.then(response => {
          if (response.success) {
            console.log("Template auto-saved successfully");
          } else {
            console.error("Failed to auto-save template:", response.error);
          }
        }).catch(error => {
          console.error("Error auto-saving template:", error);
        });
      }, 1000); // 1 second delay to avoid saving on every keystroke

      return () => clearTimeout(autoSaveTimer);
    }
  }, [subject, templateBody, settings.autoSaveTemplates, activeSection]); // Only re-run when subject, templateBody, autoSave setting, or active section changes

  // File upload
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Derived metrics
  const sentCount = React.useMemo(() => leads.filter((l) => l.status === "Sent").length, [leads])
  const failedCount = React.useMemo(() => leads.filter((l) => l.status === "Failed").length, [leads])
  const processedCount = sentCount + failedCount
  const totalTarget = Math.min(dailyLimit, leads.length)
  const remainingToTarget = Math.max(0, totalTarget - processedCount)
  const successRate = processedCount > 0 ? (sentCount / processedCount) * 100 : 0
  const progressPct = totalTarget > 0 ? (processedCount / totalTarget) * 100 : 0

  function formatETA(secondsTotal: number) {
    const h = Math.floor(secondsTotal / 3600)
    const m = Math.floor((secondsTotal % 3600) / 60)
    const s = Math.max(0, Math.floor(secondsTotal % 60))
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }
  const etaSeconds = remainingToTarget * delaySeconds

  const stats = [
    { title: "Total Leads", value: String(leads.length), icon: Users, change: "" },
    { title: "Emails Sent Today", value: String(emailStats.sent), icon: Mail, change: "" },
    { title: "Success Rate", value: `${emailStats.total > 0 ? ((emailStats.sent / emailStats.total) * 100).toFixed(1) : 0}%`, icon: TrendingUp, change: "" },
  ]

  // Add campaign stats if available
  if (campaignStats) {
    stats.push(
      { title: "Campaign Status", value: campaignStats.status, icon: FileText, change: "" }
    )
  }

  const filteredLeads = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
  }, [leads, searchQuery])

  const [aiKeyInput, setAiKeyInput] = React.useState("")

  const handleClearLeads = async () => {
    if (!leads.length) {
      toast({ title: "No leads to clear", description: "Your leads list is already empty." })
      return
    }
    if (confirm("Clear all uploaded leads? This cannot be undone.")) {
      try {
        const response = await import("@/lib/apiClient").then(module => module.default.clearLeads())
        if (response.success) {
          clearLeads()
          toast({ title: "Leads cleared", description: "All leads have been removed." })
        } else {
          throw new Error(response.error || "Failed to clear leads")
        }
      } catch (error:any) {
        toast({ 
          title: "Failed to clear leads", 
          description: error.message,
          variant: "destructive" 
        })
      }
    }
  }

  const handleSaveAiKey = () => {
    if (!aiKeyInput.trim()) {
      toast({ title: "AI API Key required", description: "Please enter a valid API key.", variant: "destructive" })
      return
    }
    toast({ title: "Feature removed", description: "AI functionality has been removed from this MVP version." })
  }

  const handleResetApp = () => {
    // Show custom confirmation dialog instead of browser confirm
    setShowResetConfirm(true);
  }

  const handleConfirmResetApp = () => {
    setIsSending(false) // stop engine if running
    resetApp()
    toast({ title: "Application reset", description: "All data has been cleared and settings restored." })
    setShowResetConfirm(false);
  }

  // Track active campaign interval
  const campaignIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartCampaign = async () => {
    try {
      console.log("handleStartCampaign called - starting campaign");
      // Get all leads
      const leadsResponse = await import("@/lib/apiClient").then(module => module.default.getAllLeads())
      if (!leadsResponse.success) {
        throw new Error("Failed to fetch leads")
      }
      
      const allLeads = leadsResponse.data
      
      if (allLeads.length === 0) {
        setTestEmailAlert({
          title: "No Leads",
          message: "No leads found. Please upload leads before starting the campaign.",
          type: "error"
        });
        setShowTestEmailAlert(true);
        return
      }

      // Get pending leads only (not already sent or failed)
      const pendingLeads = allLeads.filter((lead: any) => lead.status === "Pending");
      
      if (pendingLeads.length === 0) {
        setTestEmailAlert({
          title: "No Pending Leads",
          message: "No pending leads to send emails to. All leads have already been processed.",
          type: "error"
        });
        setShowTestEmailAlert(true);
        return
      }

      // Convert template attachments to base64
      const attachmentPromises = templateAttachments.map(async (attachment) => {
        // For template attachments, we need to fetch the file and convert to base64
        const response = await fetch(attachment.url);
        const blob = await response.blob();
        const file = new File([blob], attachment.name, { type: attachment.type });
        const base64 = await convertFileToBase64(file);
        return {
          filename: attachment.name,
          content: base64,
          encoding: 'base64'
        };
      });

      const attachments = await Promise.all(attachmentPromises);

      // First create a campaign if one doesn't exist
      let campaignId: number | null = null;
      const campaignsResponse = await import("@/lib/apiClient").then(module => module.default.getAllCampaigns());
      if (campaignsResponse.success && campaignsResponse.data.length > 0) {
        // Use the first campaign (assuming it's the active one)
        const existingCampaign = campaignsResponse.data.find((c: any) => c.status === "Running" || c.status === "Paused" || c.status === "Stopped");
        if (existingCampaign) {
          campaignId = existingCampaign.id;
          // Just continue with the existing campaign, no update function
        } else {
          // Create a new campaign
          const newCampaignResponse = await import("@/lib/apiClient").then(module => module.default.createCampaign({
            name: `Campaign-${new Date().toISOString().split('T')[0]}`,
            leadIds: pendingLeads.map((l: any) => l.id),
            dailyLimit: dailyLimit,
            delaySeconds: delaySeconds
          }));
          
          if (newCampaignResponse.success) {
            campaignId = newCampaignResponse.data?.id;
          } else {
            throw new Error(`Failed to create campaign: ${newCampaignResponse.error || 'Unknown error'}`);
          }
        }
      } else {
        // Create a new campaign
        const newCampaignResponse = await import("@/lib/apiClient").then(module => module.default.createCampaign({
          name: `Campaign-${new Date().toISOString().split('T')[0]}`,
          leadIds: pendingLeads.map((l: any) => l.id),
          dailyLimit: dailyLimit,
          delaySeconds: delaySeconds
        }));
        
        if (newCampaignResponse.success) {
          campaignId = newCampaignResponse.data?.id;
        } else {
          throw new Error(`Failed to create campaign: ${newCampaignResponse.error || 'Unknown error'}`);
        }
      }

      // Update campaign status to Running
      if (campaignId) {
        await import("@/lib/apiClient").then(module => module.default.updateCampaignStatus(campaignId, "Running"));
      }

      // Verify Gmail authentication before starting
      let authStatus;
      try {
        authStatus = await import("@/lib/apiClient").then(module => module.default.checkGmailStatus());
        if (!authStatus || !authStatus.authenticated) {
          setIsSending(false);
          setTestEmailAlert({
            title: "Gmail Not Authenticated",
            message: `To send emails, you need to authenticate with Gmail first. Please go to Settings and connect your Gmail account.`,
            type: "error"
          });
          setShowTestEmailAlert(true);
          return;
        }
      } catch (error) {
        console.error("Failed to check Gmail authentication status:", error);
        setIsSending(false);
        setTestEmailAlert({
          title: "Authentication Check Failed",
          message: `Failed to verify Gmail authentication. Please make sure you have properly authenticated your Gmail account in Settings.`,
          type: "error"
        });
        setShowTestEmailAlert(true);
        return;
      }

      // Set sending state
      setIsSending(true);
      setIsPaused(false);
      setIsCampaignCompleted(false); // Reset campaign completion status

      // Store pending leads and initial index in refs
      pendingLeadsRef.current = pendingLeads;
      currentIndexRef.current = 0;

      // Configure email scheduler with campaign settings
      try {
        await import("@/lib/apiClient").then(module => module.default.updateSchedulerConfig({
          delayBetweenEmails: delaySeconds * 1000, // Convert to milliseconds
          dailyLimit: dailyLimit
        }));
      } catch (configError) {
        console.error("Failed to configure scheduler:", configError);
        // Continue anyway since this is not critical to campaign operation
      }

      // Start processing leads one by one using a recursive approach with proper delay handling
      const processNextLead = async () => {
        // Check if sending has been stopped
        if (!isSendingRef.current) {
          // Campaign has been stopped
          if (campaignId) {
            await import("@/lib/apiClient").then(module => module.default.updateCampaignStatus(campaignId, "Stopped"));
          }
          toast({
            title: "Campaign Stopped",
            description: `Email campaign has been stopped. Processed ${currentIndexRef.current} of ${pendingLeadsRef.current.length} leads.`
          });
          return;
        }

        // Check if we've processed all leads
        if (currentIndexRef.current >= pendingLeadsRef.current.length) {
          // All leads processed
          setIsSending(false);
          if (campaignId) {
            await import("@/lib/apiClient").then(module => module.default.updateCampaignStatus(campaignId, "Completed"));
          }
          toast({
            title: "Campaign Completed",
            description: `Email campaign has completed. Processed all ${pendingLeadsRef.current.length} leads.`
          });
          refreshLeads();
          return;
        }

        // If paused, wait for resume before continuing
        if (isPausedRef.current) {
          // Check again after a short delay
          if (processNextLeadTimeoutRef.current) {
            clearTimeout(processNextLeadTimeoutRef.current);
          }
          processNextLeadTimeoutRef.current = setTimeout(processNextLead, 1000); // Check every second
          return;
        }

        // Send email to current lead
        const lead = pendingLeadsRef.current[currentIndexRef.current];
        try {
          console.log(`Attempting to send email to: ${lead.email}`);
          
          // First verify that we have valid email content
          if (!subject.trim() || !templateBody.trim()) {
            console.error(`Invalid email content for ${lead.email}`);
            // Update lead status to Failed
            await import("@/lib/apiClient").then(module => module.default.updateLeadStatus(lead.id, "Failed"));
            throw new Error("Email subject or body is empty");
          }
          
          const response = await import("@/lib/apiClient").then(module => module.default.queueEmail({
            to: lead.email,
            subject,
            body: templateBody,
            variables: { 
              name: lead.name, 
              company: lead.company || "",
              email: lead.email
            },
            campaignId,  // Pass campaign ID to track this email as part of the campaign
            attachments: attachments.length > 0 ? attachments : undefined,
            delaySeconds, // Send the delay configuration to the backend
            dailyLimit    // Send the daily limit configuration to the backend
          }));

          console.log(`Email send response for ${lead.email}:`, response);

          if (response.success) {
            console.log(`Successfully sent email to ${lead.email}`);
          } else {
            console.error(`Failed to send email to ${lead.email}:`, response.error);
            // Update lead status to Failed if backend didn't handle it
            await import("@/lib/apiClient").then(module => module.default.updateLeadStatus(lead.id, "Failed"));
          }
        } catch (error: any) {
          console.error(`Error sending email to ${lead.email}:`, error);
          // Update lead status to Failed
          await import("@/lib/apiClient").then(module => module.default.updateLeadStatus(lead.id, "Failed"));
          
          // Show error toast for the specific error
          if (error.message?.includes('Gmail not authenticated') || error.message?.includes('Gmail authentication')) {
            toast({
              title: "Gmail Authentication Error",
              description: "Please authenticate with Gmail in the Settings section before sending emails.",
              variant: "destructive"
            });
            setIsSending(false);
            return;
          } else {
            // For other errors, log them but continue the campaign
            console.log(`Email to ${lead.email} failed due to other error, continuing campaign...`, error.message);
          }
        }

        currentIndexRef.current++;
        // Refresh leads list to update UI
        refreshLeads();
        
        // Process next lead after delay (unless stopped or paused)
        if (processNextLeadTimeoutRef.current) {
          clearTimeout(processNextLeadTimeoutRef.current);
        }
        processNextLeadTimeoutRef.current = setTimeout(processNextLead, delaySeconds * 1000);
      };

      // Start processing leads
      processNextLead();

      setTestEmailAlert({
        title: "Campaign Started",
        message: `Email campaign started! Sending to ${pendingLeads.length} leads.`,
        type: "success"
      });
      setShowTestEmailAlert(true);

    } catch (error:any) {
      console.error("Campaign error:", error)
      setIsSending(false);
      setTestEmailAlert({
        title: "Campaign Failed",
        message: `Campaign failed: ${error.message}`,
        type: "error"
      });
      setShowTestEmailAlert(true);
    }
  }

  // Stop functionality
  const handleStopCampaign = async () => {
    setIsSending(false);
    setIsPaused(false);
    setIsCampaignCompleted(false); // Reset campaign completion status
    
    // Clear the timeout if it exists
    if (processNextLeadTimeoutRef.current) {
      clearTimeout(processNextLeadTimeoutRef.current);
      processNextLeadTimeoutRef.current = null;
    }
    
    // Update the campaign status to Stopped in backend
    try {
      const campaignsResponse = await import("@/lib/apiClient").then(module => module.default.getAllCampaigns())
      if (campaignsResponse.success && campaignsResponse.data.length > 0) {
        const latestCampaign = campaignsResponse.data[0]; // Assuming latest is the active one
        await import("@/lib/apiClient").then(module => module.default.updateCampaignStatus(latestCampaign.id, "Stopped"));
      }
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }

    toast({
      title: "Campaign Stopped",
      description: "Email sending has been stopped. The campaign can be restarted if needed.",
    });
  };

  const reopenTerms = () => {
    try {
      localStorage.removeItem("trinidiumlab:tnc:2025-08")
    } catch {}
    window.dispatchEvent(new Event("trinidiumlab:open-tnc"))
  }

  const reopenPrivacy = () => {
    try {
      localStorage.removeItem("trinidiumlab:privacy:2025-08")
    } catch {}
    window.dispatchEvent(new Event("trinidiumlab:open-privacy"))
  }

  const onChooseFile = () => fileInputRef.current?.click()

  const onChooseGmailJson = () => gmailJsonInputRef.current?.click()

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const onGmailJsonSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".json")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file containing Gmail API credentials.",
        variant: "destructive",
      })
      if (gmailJsonInputRef.current) {
        gmailJsonInputRef.current.value = ""
      }
      return
    }

    try {
      const text = await file.text()
      const credentialsData = JSON.parse(text)

      if (!credentialsData.installed && !credentialsData.web) {
        toast({
          title: "Invalid credentials file",
          description:
            "JSON file must contain 'installed' or 'web' credentials. Please upload a valid credentials.json file.",
          variant: "destructive",
        })
        if (gmailJsonInputRef.current) {
          gmailJsonInputRef.current.value = ""
        }
        return
      }

      // Store the entire credentials data
      setGmailCredentials(credentialsData)

      const creds = credentialsData.installed || credentialsData.web;
      const previewData = {
        client_id: creds.client_id,
        project_id: creds.project_id,
        auth_uri: creds.auth_uri,
      };
      setCredentialsPreview(previewData);
      
      // Save credentials preview to localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("trinidiumlab:credentials-preview", JSON.stringify(previewData));
      }

      toast({
        title: "Gmail credentials loaded",
        description: "Successfully loaded Gmail API credentials from JSON file.",
      })
    } catch (error) {
      toast({
        title: "Failed to parse JSON",
        description: "Please ensure the file contains valid JSON format.",
        variant: "destructive",
      })
      if (gmailJsonInputRef.current) {
        gmailJsonInputRef.current.value = ""
      }
    }
  }

  const checkGmailStatus = async () => {
    try {
      const data = await import("@/lib/apiClient").then(module => module.default.checkGmailStatus())
      
      // Set the auth status state
      setGmailAuthStatus({
        authenticated: data.authenticated,
        hasCredentials: data.hasCredentials
      })

      if (data.success) {
        if (data.authenticated) {
          toast({
            title: "Gmail Status",
            description: "Gmail is connected and authenticated - Ready to send emails",
          })
        } else if (data.hasCredentials) {
          toast({
            title: "Gmail Status",
            description: "Gmail credentials found but not authenticated - Please authenticate to send emails",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Gmail Status",
            description: "No Gmail credentials found - Please upload credentials and authenticate",
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Gmail Status",
          description: "No Gmail credentials found",
          variant: "destructive",
        })
      }
      
      // Additionally, fetch and update credentials preview from backend if available
      if (data.hasCredentials) {
        try {
          const credentialsInfo = await import("@/lib/apiClient").then(module => module.default.getGmailCredentialsInfo());
          if (credentialsInfo.success && credentialsInfo.credentials) {
            const previewData = {
              client_id: credentialsInfo.credentials.client_id,
              project_id: credentialsInfo.credentials.project_id,
              auth_uri: credentialsInfo.credentials.auth_uri,
            };
            setCredentialsPreview(previewData);
            
            // Update localStorage with the latest credentials preview
            if (typeof window !== "undefined") {
              localStorage.setItem("trinidiumlab:credentials-preview", JSON.stringify(previewData));
            }
          }
        } catch (credsError) {
          console.error("Failed to fetch credentials info:", credsError);
        }
      }
    } catch (error) {
      toast({
        title: "Status check failed",
        description: "Failed to check Gmail connection status",
        variant: "destructive",
      })
    }
  }

  const authenticateGmail = async () => {
    if (!gmailCredentials) {
      toast({
        title: "No credentials found",
        description: "Please upload Gmail API credentials first.",
        variant: "destructive",
      })
      return
    }

    setIsAuthenticating(true)
    try {
      // First upload the credentials
      const uploadResponse = await import("@/lib/apiClient").then(module => module.default.uploadGmailCredentials(gmailCredentials))
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || "Failed to upload credentials")
      }

      // Then get the auth URL
      const authResponse = await import("@/lib/apiClient").then(module => module.default.getGmailAuthUrl())

      if (authResponse.authUrl) {
        // Open OAuth2 URL in new window
        const authWindow = window.open(authResponse.authUrl, "gmail-auth", "width=500,height=600");

        // Listen for the callback message
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== "http://localhost:3000") return;

          if (event.data.type === "GMAIL_AUTH_SUCCESS") {
            toast({
              title: "Gmail authenticated",
              description: "Successfully connected to Gmail API.",
            });
            window.removeEventListener("message", handleMessage);
            // Close the auth window if it's still open
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            // Check status after successful authentication
            checkGmailStatus();
          } else if (event.data.type === "GMAIL_AUTH_ERROR") {
            toast({
              title: "Authentication failed",
              description: `Gmail authentication failed: ${event.data.error}`,
              variant: "destructive",
            });
            window.removeEventListener("message", handleMessage);
            // Close the auth window if it's still open
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
          }
        };

        window.addEventListener("message", handleMessage);
        
        // Clean up the event listener after 5 minutes if no response
        setTimeout(() => {
          window.removeEventListener("message", handleMessage);
        }, 300000); // 5 minutes
      } else {
        throw new Error(authResponse.error || "Failed to generate auth URL");
      }
    } catch (error:any) {
      toast({
        title: "Authentication failed",
        description: `Failed to authenticate with Gmail API: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const removeGmailCredentials = async () => {
    // Show custom confirmation dialog instead of browser confirm
    setShowGmailRemoveConfirm(true);
  }

  const handleConfirmRemoveGmailCredentials = async () => {
    try {
      const response = await import("@/lib/apiClient").then(module => module.default.removeGmailCredentials())
      
      if (response.success) {
        // Clear local state
        setGmailCredentials(null)
        setCredentialsPreview(null)
        setGmailAuthStatus(null)
        if (gmailJsonInputRef.current) {
          gmailJsonInputRef.current.value = ""
        }
        
        // Remove stored credentials preview
        if (typeof window !== "undefined") {
          localStorage.removeItem("trinidiumlab:credentials-preview");
        }
        
        toast({
          title: "Gmail credentials removed",
          description: "Successfully removed Gmail API credentials and reset authentication.",
        })
      } else {
        throw new Error(response.error || "Failed to remove credentials")
      }
    } catch (error) {
      toast({
        title: "Removal failed",
        description: "Failed to remove Gmail credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setShowGmailRemoveConfirm(false);
    }
  }

  // Check Gmail auth status and refresh leads when settings section becomes active
  React.useEffect(() => {
    if (activeSection === "settings") {
      checkGmailStatus()
    } else if (activeSection === "dashboard") {
      refreshLeads()
    }
  }, [activeSection])

  // Load email templates when email section becomes active
  React.useEffect(() => {
    if (activeSection === "email") {
      const loadEmailTemplates = async () => {
        try {
          // Get the most recent main template
          const response = await import("@/lib/apiClient").then(module => module.default.getLatestEmailTemplates());
          
          if (response.success && response.data) {
            const { mainTemplate } = response.data;
            
            if (mainTemplate) {
              // Update the main template
              setSubject(mainTemplate.subject || "");
              setTemplateBody(mainTemplate.body || "");
            } else {
              // No main template found
              setSubject("");
              setTemplateBody("");
            }
            

            
            // Show toast only if we actually loaded templates
            if (mainTemplate) {
              toast({
                title: "Template loaded",
                description: "Previous email template has been loaded from storage.",
              });
            }
          }
        } catch (error) {
          console.error("Failed to load email templates:", error);
          toast({
            title: "Load failed",
            description: "Could not load saved email templates. Starting with empty templates.",
            variant: "destructive",
          });
        }
      };
      
      loadEmailTemplates();
    }
  }, [activeSection]);

  const clearTemplate = async () => {
    if (confirm("Clear the main email template? This cannot be undone.")) {
      try {
        // Set the ref to indicate we're clearing the template (to prevent auto-save)
        isClearingTemplateRef.current = true;

        // First reset the local state
        setSubject("");
        setTemplateBody("");
        setTemplateAttachments([]); // Clear any template attachments
        
        // Clear all default templates first
        // Save an empty template to the backend to clear it from storage
        const response = await import("@/lib/apiClient").then(module => module.default.saveEmailTemplate({
          subject: "",
          body: "",
        }));
        


        if (response.success) {
          toast({
            title: "Template cleared",
            description: "The main email template has been cleared from storage.",
          });
        } else {
          // If backend save fails, still show local success since we reset the UI
          console.error("Failed to clear template in backend:", response.error);
          toast({
            title: "Template cleared locally",
            description: "Template has been cleared, but there was an issue updating the database.",
          });
        }
      } catch (error: any) {
        console.error("Failed to clear template:", error);
        toast({
          title: "Clear failed",
          description: "Failed to clear the template. Please try again.",
          variant: "destructive"
        });
      } finally {
        // Reset the ref after clearing is done
        isClearingTemplateRef.current = false;
      }
    }
  }











  const sampleData = {
    name: "John Doe",
    email: "user@trinidiumlab.com",
    company: "TrinidiumLab",
  }

  const processTemplate = (template: string) => {
    return template
      .replace(/{name}/g, sampleData.name)
      .replace(/{email}/g, sampleData.email)
      .replace(/{company}/g, sampleData.company)
  }

  // Function to strip HTML tags for clean text preview while preserving line breaks
  const stripHtmlTags = (html: string): string => {
    // Replace <br> tags with line breaks first
    let cleanHtml = html.replace(/<br\s*\/?>/gi, '\n');
    // Replace </p> tags with double line breaks to maintain paragraph spacing
    cleanHtml = cleanHtml.replace(/<\/p>/gi, '\n\n');
    // Replace <p> tags with line breaks
    cleanHtml = cleanHtml.replace(/<p[^>]*>/gi, '');
    // Replace </div> tags with double line breaks to maintain spacing
    cleanHtml = cleanHtml.replace(/<\/div>/gi, '\n\n');
    // Replace <div> tags with line breaks
    cleanHtml = cleanHtml.replace(/<div[^>]*>/gi, '');
    // Replace other block-level elements with line breaks as needed
    cleanHtml = cleanHtml.replace(/<\/?h[1-6][^>]*>/gi, '\n\n');
    cleanHtml = cleanHtml.replace(/<\/?ul[^>]*>/gi, '\n\n');
    cleanHtml = cleanHtml.replace(/<\/?ol[^>]*>/gi, '\n\n');
    cleanHtml = cleanHtml.replace(/<\/?li[^>]*>/gi, '\n');
    
    // Create a temporary div element to parse the remaining HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    // Return the text content without HTML tags
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  const previewSubject = subject ? processTemplate(subject) : "No subject"
  const previewBody = templateBody ? stripHtmlTags(processTemplate(templateBody)) : "No template content"

  const [templateAttachments, setTemplateAttachments] = useState<
    Array<{
      id: string
      name: string
      size: number
      type: string
      url: string
    }>
  >([])



  const insertVariable = (token: string) => {
    if (lastFocused === "subject") {
      const input = subjectRef.current
      if (!input) return

      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = subject.slice(0, start) + token + subject.slice(end)

      setSubject(newValue)

      setTimeout(() => {
        if (input) {
          input.focus()
          input.setSelectionRange(start + token.length, start + token.length)
        }
      }, 0)
    } else {
      // For rich text editor (body), we need to trigger the variable insertion in the editor
      // Since the editor is managing its own selection, we will update the template body
      // but also ensure the editor gets focus so it can handle the insertion properly
      setLastFocused("body");
      setTemplateBody(prev => prev); // Trigger re-render to ensure editor is aware of state change
    }
  }

  const insertVariableIntoRichText = (variable: string) => {
    // This function will be passed to the RichTextEditor to handle variable insertion
    // when the internal variable buttons are used
    setLastFocused("body");
    // The RichTextEditor will handle the actual insertion internally
  }



  const onVariableKeyDown = (event: React.KeyboardEvent, token: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Set focus to body and trigger variable insertion
      setLastFocused("body");
      // Focus the editor element to ensure it's ready to receive the variable
      setTimeout(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        if (editor && editor instanceof HTMLElement) {
          editor.focus();
        }
      }, 0);
      insertVariable(token);
    }
  }



  const parseCsvToLeads = (text: string): Lead[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []
    
    // Parse headers (case-insensitive)
    const originalHeaders = lines[0].split(",").map((h) => h.trim())
    const lowerHeaders = originalHeaders.map((h) => h.toLowerCase())
    
    // Find the indices (case-insensitive) for required/optional fields
    const emailIdx = lowerHeaders.findIndex((h) => h === "email")
    if (emailIdx === -1) return [] // email is mandatory
    
    const nameIdx = lowerHeaders.findIndex((h) => h === "name")
    const companyIdx = lowerHeaders.findIndex((h) => h === "company")
    
    const out: Lead[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",")
      // Make sure we have enough columns
      if (cols.length <= emailIdx) continue
      
      const email = (cols[emailIdx] || "").trim()
      if (!email) continue
      
      // Handle optional columns - use original header index to get value 
      const name = nameIdx !== -1 && cols.length > nameIdx ? (cols[nameIdx] || "").trim() : ""
      const company = companyIdx !== -1 && cols.length > companyIdx ? (cols[companyIdx] || "").trim() : ""
      
      out.push({ name, email, company, status: "Pending" })
    }
    return out
  }

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      })
      return
    }

    try {
      const data = await import("@/lib/apiClient").then(module => module.default.importLeads(file))
      
      if (data.success) {
        toast({
          title: "Leads uploaded",
          description: data.message || `Successfully uploaded leads.`,
        })
        // Refresh leads list
        refreshLeads()
      } else {
        throw new Error(data.error || "Failed to import leads")
      }
    } catch (error) {
      toast({
        title: "Failed to import CSV",
        description: "Please ensure your CSV contains an email column with valid email addresses. Other columns are optional.",
        variant: "destructive",
      })
    }
  }



  if (activeSection === "email") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Email Templates</h2>
          <p className="text-slate-400">Create and manage your email templates with variable placeholders</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Template Editor
            </CardTitle>
            <CardDescription className="text-slate-400">
              Create your email template with placeholders for personalization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-slate-300">
                Email Subject
              </Label>
              <Input
                id="subject"
                ref={subjectRef}
                onFocus={() => setLastFocused("subject")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Hello {name}, special offer for {company}"
                className="select-text bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template" className="text-slate-300">
                Email Template
              </Label>
              <RichTextEditor
                value={templateBody}
                onChange={setTemplateBody}
                placeholder={`Hi {name},

I hope this email finds you well. I wanted to reach out to you at {company} to discuss...

Best regards,
Your Name`}
                className="bg-slate-700/50 border-slate-600 text-white"
                variables={["{name}", "{email}", "{company}"]}
                attachments={templateAttachments}
                onAttachmentsChange={setTemplateAttachments}
                showVariables={false}
                onInsertVariable={insertVariableIntoRichText}
              />
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-slate-400">Available Variables:</span>
                {["{name}", "{email}", "{company}"].map((tok) => (
                  <Badge
                    key={tok}
                    variant="outline"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // Set focus to body and trigger variable insertion
                      setLastFocused("body");
                      // Focus the editor element to ensure it's ready to receive the variable
                      setTimeout(() => {
                        const editor = document.querySelector('[contenteditable="true"]');
                        if (editor && editor instanceof HTMLElement) {
                          editor.focus();
                        }
                      }, 0);
                      insertVariable(tok);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLastFocused("body");
                        setTimeout(() => {
                          const editor = document.querySelector('[contenteditable="true"]');
                          if (editor && editor instanceof HTMLElement) {
                            editor.focus();
                          }
                        }, 0);
                        insertVariable(tok);
                      }
                    }}
                    className="text-slate-300 border-slate-600 cursor-pointer hover:bg-slate-600/40"
                  >
                    {tok}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={clearTemplate}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Template
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Template Preview */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Template Preview</CardTitle>
            <CardDescription className="text-slate-400">
              Preview how your template will look with sample data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-300">
                  Subject: <span className="text-white">{previewSubject}</span>
                </p>
                <hr className="border-slate-600" />
              </div>
              <div className="text-white whitespace-pre-wrap">{previewBody}</div>
            </div>
          </CardContent>
        </Card>

        {/* Sending Configuration */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Sending Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Configure email sending parameters and rate limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delay" className="text-slate-300">
                  Delay Between Emails (seconds)
                </Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  max="3600"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit" className="text-slate-300">
                  Daily Email Limit
                </Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Ready to Start Your Email Campaign?</h3>
                <p className="text-slate-300">
                  Your email template and configuration are set. Click below to begin sending emails to your contacts.
                </p>
              </div>
              <div className="flex justify-center gap-4">
                {isCampaignCompleted ? (
                  // Campaign is completed - show completion message
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-green-500 mb-4">
                      <CheckCircle className="h-6 w-6" />
                      <h3 className="text-xl font-bold">Campaign Completed!</h3>
                    </div>
                    <p className="text-slate-300 mb-4">All emails have been sent successfully.</p>
                    <Button
                      onClick={() => {
                        // Reset campaign completion to allow starting new campaign
                        setIsCampaignCompleted(false);
                      }}
                      size="lg"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      Start New Campaign
                    </Button>
                  </div>
                ) : (
                  // Campaign is not running - show Start button (or show running state with controls)
                  isSending ? (
                    // Campaign is running - show pause/stop controls
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-lg text-white font-medium">
                        {isPaused ? "Campaign Paused" : "Campaign Running..."}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={isPaused ? handleResumeCampaign : handlePauseCampaign}
                          size="lg"
                          variant={isPaused ? "default" : "secondary"}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 shadow-lg"
                        >
                          {isPaused ? (
                            <>
                              <Play className="h-5 w-5 mr-2" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-5 w-5 mr-2" />
                              Pause
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleStopCampaign}
                          size="lg"
                          variant="destructive"
                          className="text-white font-semibold px-6 py-3 shadow-lg"
                        >
                          <Square className="h-5 w-5 mr-2" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Show start button when not sending
                    <Button
                      onClick={async () => {
                        // Validation
                        if (!subject.trim()) {
                          setTestEmailAlert({
                            title: "Validation Error",
                            message: "Please enter an email subject",
                            type: "error"
                          });
                          setShowTestEmailAlert(true);
                          return
                        }
                        if (!templateBody.trim()) {
                          setTestEmailAlert({
                            title: "Validation Error",
                            message: "Please enter email content",
                            type: "error"
                          });
                          setShowTestEmailAlert(true);
                          return
                        }

                        setShowStartCampaignDialog(true)
                      }}
                      size="lg"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Email Campaign
                    </Button>
                  )
                )}
              </div>
              <div className="flex items-end gap-2 mt-4">
                <div className="flex-1">
                  <Label htmlFor="test-email" className="text-slate-300">
                    Test Email Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmailInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTestEmailInput(value);
                        // Save to localStorage
                        if (typeof window !== "undefined") {
                          if (value) {
                            localStorage.setItem("trinidiumlab:test-email-input", value);
                          } else {
                            localStorage.removeItem("trinidiumlab:test-email-input");
                          }
                        }
                      }}
                      placeholder="your.email@example.com"
                      className="bg-slate-700/50 border-slate-600 text-white mt-1 flex-1"
                    />
                    {testEmailInput && (
                      <Button
                        onClick={() => {
                          setTestEmailInput("");
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("trinidiumlab:test-email-input");
                          }
                        }}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 h-[42px] mt-1"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!testEmailInput.trim()) {
                      setTestEmailAlert({
                        title: "Validation Error",
                        message: "Please enter a test email address",
                        type: "error"
                      });
                      setShowTestEmailAlert(true);
                      return;
                    }

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(testEmailInput)) {
                      setTestEmailAlert({
                        title: "Validation Error",
                        message: "Please enter a valid email address",
                        type: "error"
                      });
                      setShowTestEmailAlert(true);
                      return;
                    }

                    try {
                      // Convert template attachments to base64
                      const attachmentPromises = templateAttachments.map(async (attachment) => {
                        // For template attachments, we need to fetch the file and convert to base64
                        const response = await fetch(attachment.url);
                        const blob = await response.blob();
                        const file = new File([blob], attachment.name, { type: attachment.type });
                        const base64 = await convertFileToBase64(file);
                        return {
                          filename: attachment.name,
                          content: base64,
                          encoding: 'base64'
                        };
                      });

                      const attachments = await Promise.all(attachmentPromises);

                      const response = await import("@/lib/apiClient").then(module => module.default.sendEmail({
                        to: testEmailInput,
                        subject: subject || "Test Email from TrinidiumLab",
                        body: templateBody || "<p>This is a test email from TrinidiumLab.</p>",
                        attachments: attachments.length > 0 ? attachments : undefined
                      }))
                      
                      if (response.success) {
                        setTestEmailAlert({
                          title: "Test Email Sent",
                          message: `Test email sent successfully to ${testEmailInput}!`,
                          type: "success"
                        });
                        setShowTestEmailAlert(true);
                        // Don't clear the input field - keep it for future use
                      } else {
                        throw new Error(response.error || "Failed to send test email");
                      }
                    } catch (error:any) {
                      console.error("Test email error:", error);
                      setTestEmailAlert({
                        title: "Test Email Failed",
                        message: `Failed to send test email: ${error.message}`,
                        type: "error"
                      });
                      setShowTestEmailAlert(true);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Send Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <AlertMessageDialog 
          open={showTestEmailAlert}
          onOpenChange={setShowTestEmailAlert}
          title={testEmailAlert.title}
          message={testEmailAlert.message}
          type={testEmailAlert.type}
        />
        
        <StartCampaignDialog
          open={showStartCampaignDialog}
          onOpenChange={setShowStartCampaignDialog}
          onConfirm={handleStartCampaign}
          subject={subject}

          delaySeconds={delaySeconds}
          dailyLimit={dailyLimit}
        />
      </div>
    )
  }

  // DASHBOARD
  if (activeSection === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Welcome</h2>
            <p className="text-slate-400">Here's what's happening with your email campaigns today.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Processing Progress</CardTitle>
              <CardDescription className="text-slate-400">Current batch processing status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Leads Processed</span>
                  <span className="text-white">
                    {emailStats.sent + emailStats.failed} / {totalTarget}
                  </span>
                </div>
                <Progress value={totalTarget > 0 ? ((emailStats.sent + emailStats.failed) / totalTarget) * 100 : 0} className="h-2" />
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Estimated completion: {formatETA(Math.max(0, totalTarget - (emailStats.sent + emailStats.failed)) * delaySeconds)}</span>
                <span>{totalTarget > 0 ? (((emailStats.sent + emailStats.failed) / totalTarget) * 100).toFixed(0) : 0}% complete</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription className="text-slate-400">Latest email sending activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leads
                  .filter(lead => lead.status === "Sent" || lead.status === "Failed")
                  .slice(0, 5)
                  .map((lead, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {lead.status === "Sent" ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {lead.status === "Sent" 
                            ? `Email sent to ${lead.email}` 
                            : `Failed to send to ${lead.email}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {lead.name}
                          {lead.updated_at && ` • ${new Date(lead.updated_at).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                  ))}
                {leads.filter(lead => lead.status === "Sent" || lead.status === "Failed").length === 0 && (
                  <div className="text-center py-4 text-slate-500">
                    <p className="text-sm">No email activity yet</p>
                    <p className="text-xs">Send some emails to see activity here</p>
                  </div>
                )}
              </div>
              {/* Download buttons for email logs */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={async () => {
                    try {
                      const blob = await import("@/lib/apiClient").then(module => module.default.downloadEmailLogs('success'));
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'email-success-logs.txt';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Failed to download success logs:', error);
                      setTestEmailAlert({
                        title: "Download Failed",
                        message: "Failed to download success logs",
                        type: "error"
                      });
                      setShowTestEmailAlert(true);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Success Logs
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const blob = await import("@/lib/apiClient").then(module => module.default.downloadEmailLogs('error'));
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'email-error-logs.txt';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Failed to download error logs:', error);
                      setTestEmailAlert({
                        title: "Download Failed",
                        message: "Failed to download error logs",
                        type: "error"
                      });
                      setShowTestEmailAlert(true);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Error Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // LEADS
  if (activeSection === "leads") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Lead Management</h2>
            <p className="text-slate-400">Upload and manage your email leads</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleClearLeads}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Leads
          </Button>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Upload CSV File</CardTitle>
            <CardDescription className="text-slate-400">
              Upload a CSV file with columns: name, email, company (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileSelected}
              aria-hidden="true"
            />
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-white mb-2">Drop your CSV file here, or click to browse</p>
              <p className="text-sm text-slate-400">Only CSV files are accepted. Must contain an 'email' column (case-insensitive). Other columns are optional.</p>
              <Button
                onClick={onChooseFile}
                className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Uploaded Leads</CardTitle>
            <CardDescription className="text-slate-400">
              {filteredLeads.length} of {leads.length} showing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, index) => (
                    <tr key={index} className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-white">{lead.name}</td>
                      <td className="py-3 px-4 text-slate-300">{lead.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            lead.status === "Sent" ? "default" : lead.status === "Pending" ? "secondary" : "destructive"
                          }
                          className={
                            lead.status === "Sent"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : lead.status === "Pending"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {lead.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!filteredLeads.length && (
                    <tr>
                      <td colSpan={3} className="py-6 px-4 text-center text-slate-400">
                        No leads match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SETTINGS
  if (activeSection === "settings") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <p className="text-slate-400">Configure your application settings and integrations</p>
        </div>

        {/* Gmail API Integration */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 font-bold">
              <Mail className="h-5 w-5 text-white" />
              Gmail API Integration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Connect your Gmail account to send automated emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Gmail Credentials</Label>
                <p className="text-sm text-slate-500 mb-2">Upload your Gmail API credentials JSON file</p>
                <Input
                  ref={gmailJsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={onGmailJsonSelected}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={onChooseGmailJson}
                    variant="outline"
                    className="border-slate-600 text-slate-300 bg-transparent"
                  >
                    Choose File
                  </Button>
                  {(gmailCredentials || (gmailAuthStatus && gmailAuthStatus.authenticated)) && (
                    <Button
                      onClick={removeGmailCredentials}
                      variant="outline"
                      className="border-red-500/50 text-red-400 bg-transparent hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Credentials
                    </Button>
                  )}
                </div>
                {(gmailCredentials || (gmailAuthStatus && gmailAuthStatus.authenticated)) && (
                  <p className="text-xs text-slate-500 mt-2">
                    Note: Removing credentials will also reset your Gmail authentication.
                    You'll need to re-upload credentials and re-authenticate to send emails.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={authenticateGmail}
                  disabled={!gmailCredentials || isAuthenticating}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isAuthenticating ? "Authenticating..." : "Authenticate Gmail"}
                </Button>

                <Button
                  variant="outline"
                  onClick={checkGmailStatus}
                  className="border-slate-600 text-slate-300 bg-transparent"
                >
                  Check Status
                </Button>
              </div>

              {/* Status indicator */}
              {gmailAuthStatus && (
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                  <h4 className="text-white font-medium mb-2">Authentication Status:</h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${gmailAuthStatus.authenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-slate-300">
                      {gmailAuthStatus.authenticated 
                        ? "Authenticated - Ready to send emails" 
                        : gmailAuthStatus.hasCredentials 
                          ? "Credentials found but not authenticated" 
                          : "No credentials found"}
                    </span>
                  </div>
                </div>
              )}

              {credentialsPreview && (
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                  <h4 className="text-white font-medium mb-2">Credentials Preview:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client ID:</span>
                      <span className="text-slate-300 font-mono text-xs">
                        {credentialsPreview.client_id?.substring(0, 20)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Project ID:</span>
                      <span className="text-slate-300">{credentialsPreview.project_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Auth URI:</span>
                      <span className="text-slate-300">{credentialsPreview.auth_uri}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                <h4 className="text-white font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                  <li>Create a project in Google Cloud Console</li>
                  <li>Enable Gmail API</li>
                  <li>Create OAuth 2.0 credentials</li>
                  <li>Download credentials JSON file</li>
                  <li>Upload the file above and authenticate</li>
                  <li>To reset authentication, click "Remove Credentials" and re-upload</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 font-bold">
              <SettingsIcon className="h-5 w-5 text-white" />
              General Settings
            </CardTitle>
            <CardDescription className="text-slate-400">Configure general application preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Email Notifications</Label>
                <p className="text-sm text-slate-500">Receive notifications about campaign status</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(v) => setSetting("emailNotifications", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Auto-save Templates</Label>
                <p className="text-sm text-slate-500">Automatically save template changes</p>
              </div>
              <Switch
                checked={settings.autoSaveTemplates}
                onCheckedChange={(v) => setSetting("autoSaveTemplates", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal & Privacy */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-white" />
              Legal & Privacy
            </CardTitle>
            <CardDescription className="text-slate-400">
              Review and re-accept Terms & Conditions or Privacy Policy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={reopenTerms}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Terms & Conditions
              </Button>
              <Button
                variant="outline"
                onClick={reopenPrivacy}
                className="border-slate-600 text-slate-300 bg-transparent"
              >
                <Shield className="h-4 w-4 mr-2" />
                View Privacy Policy
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Clicking these will reset your consent for that policy and require re-acceptance.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Danger Zone</CardTitle>
            <CardDescription className="text-red-400">Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg bg-red-500/5">
              <div>
                <p className="text-white font-medium">Reset All Data</p>
                <p className="text-sm text-slate-400">This will delete all leads, logs, and settings</p>
              </div>
              <Button variant="destructive" onClick={handleResetApp}>
                Reset Application
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <AlertMessageDialog 
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          title="Confirm Reset Application"
          message="Are you sure you want to reset the application? This will delete all leads, logs, and settings. This action cannot be undone."
          type="error"
          showCancel={true}
          onConfirm={handleConfirmResetApp}
          onCancel={() => setShowResetConfirm(false)}
        />
        
        <GmailRemoveDialog
          open={showGmailRemoveConfirm}
          onOpenChange={setShowGmailRemoveConfirm}
          onConfirm={handleConfirmRemoveGmailCredentials}
        />
      </div>
    )
  }

  return null
}
