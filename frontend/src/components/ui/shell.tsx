/** Pegasus Design — Shell Layout with Sidebar Navigation */
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  Package,
  Truck,
  Wrench,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Brain,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { id: "crm", label: "CRM", href: "/crm", icon: Users },
  { id: "estimating", label: "Estimating", href: "/estimating", icon: FileText },
  { id: "projects", label: "Projects", href: "/projects", icon: ClipboardList },
  { id: "scheduling", label: "Schedule", href: "/scheduling", icon: Calendar },
  { id: "inventory", label: "Inventory", href: "/inventory", icon: Package },
  { id: "installs", label: "Installs", href: "/installs", icon: Truck },
  { id: "production", label: "Production", href: "/production", icon: Wrench },
  { id: "financial", label: "Financial", href: "/financial", icon: DollarSign },
  { id: "qc", label: "QC & Callbacks", href: "/qc", icon: CheckCircle },
  { id: "growth", label: "Growth Intel", href: "/growth", icon: TrendingUp },
  { id: "ai", label: "AI Insights", href: "/ai", icon: Brain },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: Clock },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { aiMode, activeModule, setActiveModule } = useAppStore();

  const aiModeLabel =
    aiMode === "observe" ? "OBSERVE" : aiMode === "assist" ? "ASSIST" : "AUTOMATE";
  const aiModeColor =
    aiMode === "observe"
      ? "text-info"
      : aiMode === "assist"
      ? "text-accent"
      : "text-success";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col bg-surface border-r border-border transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-[#1a0900] font-bold text-sm">P</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">PEGASUS</span>
              <span className="text-[10px] text-muted tracking-widest uppercase">Design</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate font-medium">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI Mode + Collapse */}
        <div className="p-3 border-t border-border space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-elevated">
              <Brain className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs text-muted">AI Mode:</span>
              <span className={cn("text-xs font-semibold tracking-wide", aiModeColor)}>
                {aiModeLabel}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
