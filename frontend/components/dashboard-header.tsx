"use client"

import { Bell, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAppState } from "@/lib/app-state"

export function DashboardHeader() {
  const { searchQuery, setSearchQuery } = useAppState()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-700/50 bg-slate-900/50 px-4 md:px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 md:gap-4">
        <SidebarTrigger className="text-slate-300 hover:text-white" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search leads by name or email"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="select-text w-56 md:w-72 bg-slate-800/50 border-slate-700 pl-10 text-white placeholder:text-slate-400 focus:border-blue-500"
          />
        </div>
      </div>
    </header>
  )
}
