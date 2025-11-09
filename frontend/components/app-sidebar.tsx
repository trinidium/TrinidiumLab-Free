"use client"
import { Users, Mail, Settings, Home } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAppState } from "@/lib/app-state"

const menuItems = [
  { title: "Dashboard", section: "dashboard" as const, icon: Home },
  { title: "Lead Management", section: "leads" as const, icon: Users },
  { title: "Email Templates", section: "email" as const, icon: Mail },
  { title: "Settings", section: "settings" as const, icon: Settings },
]

export function AppSidebar() {
  const { activeSection, setActiveSection } = useAppState()

  return (
    <Sidebar className="border-r border-slate-700/50">
      <SidebarHeader className="border-b border-slate-700/50 p-6">
        <div className="flex items-center gap-3">
          {/* Using your custom Owl.svg logo with slightly larger container */}
          <div className="flex h-12 w-12 items-center justify-center">
            <img 
              src="/Owl.svg" 
              alt="Company Logo" 
              className="h-12 w-12 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TrinidiumLab</h1>
            <p className="text-sm text-slate-400 font-medium">Email Automation</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = activeSection === item.section
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-800/50 hover:text-white data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-500/20 data-[active=true]:to-purple-600/20 data-[active=true]:text-white"
                    >
                      <button onClick={() => setActiveSection(item.section)}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
