"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardContent } from "@/components/dashboard-content"
import { AppStateProvider } from "@/lib/app-state"
import { SiteFooter } from "@/components/site-footer"
import { TermsDialog } from "@/components/terms-dialog"
import { PrivacyDialog } from "@/components/privacy-dialog"
import { CopyGuard } from "@/components/copy-guard"

export default function Page() {
  return (
    <SidebarProvider defaultOpen>
      <AppStateProvider>
        <CopyGuard />
        <TermsDialog />
        <PrivacyDialog />
        <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6">
              <DashboardContent />
            </main>
            <SiteFooter />
          </SidebarInset>
        </div>
      </AppStateProvider>
    </SidebarProvider>
  )
}
