"use client"

import * as React from "react"
import ApiClient from "./apiClient"

type Section = "dashboard" | "leads" | "email" | "settings"

export type LeadStatus = "Sent" | "Pending" | "Failed"
export type Lead = { 
  id?: number; 
  name: string; 
  email: string; 
  status: LeadStatus; 
  company?: string;
  created_at?: string;
  updated_at?: string;
}
export type LogEntry = { type: "success" | "error"; message: string; time: string }

type Settings = {
  emailNotifications: boolean
  autoSaveTemplates: boolean
}

type AppState = {
  // navigation
  activeSection: Section
  setActiveSection: (s: Section) => void

  // search
  searchQuery: string
  setSearchQuery: (q: string) => void

  // leads
  leads: Lead[]
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>
  clearLeads: () => void
  refreshLeads: () => Promise<void>

  // logs
  logs: LogEntry[]
  addLog: (entry: LogEntry) => void
  clearLogs: () => void

  // settings
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void

  // danger zone
  resetApp: () => void
}

const AppStateContext = React.createContext<AppState | null>(null)

const LS = {
  notif: "trinidiumlab:email-notifications",
  autosave: "trinidiumlab:auto-save",
}

const initialLeads: Lead[] = []

const initialLogs: LogEntry[] = []

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = React.useState<Section>("dashboard")
  const [searchQuery, setSearchQuery] = React.useState("")

  const [leads, setLeads] = React.useState<Lead[]>(initialLeads)
  const [logs, setLogs] = React.useState<LogEntry[]>(initialLogs)

  const [settings, setSettings] = React.useState<Settings>(() => {
    if (typeof window === "undefined") {
      return {
        emailNotifications: true,
        autoSaveTemplates: true,
      }
    }
    const notif = localStorage.getItem(LS.notif)
    const autosave = localStorage.getItem(LS.autosave)
    return {
      emailNotifications: notif ? notif === "true" : true,
      autoSaveTemplates: autosave ? autosave === "true" : true,
    }
  })

  // Load real data from backend on mount
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await ApiClient.getAllLeads();
        if (response.success && Array.isArray(response.data)) {
          setLeads(response.data);
        }
      } catch (error) {
        console.error("Failed to load initial leads data:", error);
      }
    };

    loadInitialData();
  }, []);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const setSetting = React.useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "emailNotifications") localStorage.setItem(LS.notif, String(value))
      if (key === "autoSaveTemplates") localStorage.setItem(LS.autosave, String(value))
      return next
    })
  }, [])

  const clearLeads = React.useCallback(() => setLeads([]), [])
  const addLog = React.useCallback((entry: LogEntry) => setLogs((l) => [entry, ...l]), [])
  const clearLogs = React.useCallback(() => setLogs([]), [])

  const refreshLeads = React.useCallback(async () => {
    try {
      const response = await ApiClient.getAllLeads();
      if (response.success && Array.isArray(response.data)) {
        setLeads(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh leads data:", error);
    }
  }, []);

  const resetApp = React.useCallback(() => {
    localStorage.removeItem(LS.notif)
    localStorage.removeItem(LS.autosave)
    setSettings({
      emailNotifications: true,
      autoSaveTemplates: true,
    })
    setLeads([])
    setLogs([])
    setSearchQuery("")
    setActiveSection("dashboard")
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const value = React.useMemo<AppState>(
    () => ({
      activeSection,
      setActiveSection,
      searchQuery,
      setSearchQuery,
      leads,
      setLeads,
      clearLeads,
      refreshLeads,
      logs,
      addLog,
      clearLogs,
      settings,
      setSetting,
      resetApp,
    }),
    [activeSection, searchQuery, leads, logs, settings, clearLeads, addLog, clearLogs, resetApp, refreshLeads],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = React.useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}
