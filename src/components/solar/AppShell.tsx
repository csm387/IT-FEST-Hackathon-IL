import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, LayoutDashboard, Map, Building2, Zap, BatteryCharging, CloudSun, Wallet, Scale, Lightbulb, Wrench, Search, Sun } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "./notifications";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Prosumer", items: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Energy flow", url: "/flow", icon: Zap },
    { title: "Battery", url: "/battery", icon: BatteryCharging },
    { title: "Forecast", url: "/forecast", icon: CloudSun },
    { title: "Recommendations", url: "/recommendations", icon: Lightbulb },
    { title: "Finance", url: "/finance", icon: Wallet },
    { title: "Regulations", url: "/regulations", icon: Scale },
  ]},
  { label: "Operations", items: [
    { title: "Fleet map", url: "/map", icon: Map },
    { title: "Installations", url: "/sites", icon: Building2 },
    { title: "O&M center", url: "/operations", icon: Wrench },
    { title: "Notifications", url: "/notifications", icon: Bell },
  ]},
] as const;

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary"><Sun className="h-4 w-4 text-primary-foreground" /></span>
      {!compact && <span className="font-display text-lg font-semibold tracking-tight">Solar<span className="text-solar">Ops</span></span>}
    </span>
  );
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center px-3"><Link to="/"><Logo compact={collapsed} /></Link></SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={path.startsWith(it.url)} tooltip={it.title}>
                      <Link to={it.url}><it.icon className="h-4 w-4" /><span>{it.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function Bellmenu() {
  const { notes, unread, markAll, markRead } = useNotifications();
  return (
    <Popover>
      <PopoverTrigger className="relative grid h-9 w-9 place-items-center rounded-xl border border-border hover:bg-accent" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold">Notifications</span>
          <button onClick={markAll} className="text-xs text-solar hover:underline">Mark all read</button>
        </div>
        <div className="max-h-96 overflow-auto">
          {notes.slice(0, 8).map((n) => (
            <button key={n.id} onClick={() => markRead(n.id)} className={cn("block w-full border-b border-border p-3 text-left hover:bg-accent", !n.read && "bg-primary/5")}>
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{n.title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span></div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
            </button>
          ))}
        </div>
        <Link to="/notifications" className="block p-3 text-center text-xs text-solar hover:underline">Open notification center</Link>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-[500] flex h-16 items-center gap-3 border-b border-border bg-background px-4">
            <SidebarTrigger />
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search sites, alerts, inverters…" className="h-9 w-full rounded-xl border border-border bg-background/40 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex">
                <span className="relative h-2 w-2"><span className="pulse-ring absolute inset-0 rounded-full bg-solar" /><span className="absolute inset-0 rounded-full bg-solar" /></span>
                Live · simulated data
              </span>
              <Bellmenu />
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-bold text-primary-foreground">AP</span>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
