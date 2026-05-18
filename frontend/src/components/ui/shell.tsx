/** Pegasus Design — InlineIQ-Aligned Shell with 52px Icon Rail */
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import {
  LayoutDashboard, Users, FileText, ClipboardList, Calendar,
  Package, Truck, Wrench, DollarSign, CheckCircle, TrendingUp,
  Brain, Clock, Settings, ChevronLeft, ChevronRight, BarChart2,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Command", href: "/dashboard", icon: LayoutDashboard },
  { id: "crm", label: "CRM", href: "/crm", icon: Users },
  { id: "estimating", label: "Estimating", href: "/estimating", icon: FileText },
  { id: "projects", label: "Projects", href: "/projects", icon: ClipboardList },
  { id: "scheduling", label: "Schedule", href: "/scheduling", icon: Calendar },
  { id: "inventory", label: "Inventory", href: "/inventory", icon: Package },
  { id: "installs", label: "Installs", href: "/installs", icon: Truck },
  { id: "production", label: "Production", href: "/production", icon: Wrench },
  { id: "financial",    label: "Financial",   href: "/financial",    icon: DollarSign },
  { id: "job-costing", label: "Job Costing", href: "/job-costing", icon: BarChart2 },
  { id: "qc", label: "QC", href: "/qc", icon: CheckCircle },
  { id: "growth", label: "Growth", href: "/growth", icon: TrendingUp },
  { id: "ai", label: "AI", href: "/ai", icon: Brain },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: Clock },
  { id: "admin", label: "Admin", href: "/admin", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { aiMode, setActiveModule, activeModule } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── 52px Icon Rail Sidebar ────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col bg-[#04060a] border-r border-border transition-all duration-200",
          collapsed ? "w-[52px]" : "w-[180px]"
        )}
      >
        {/* Logo mark */}
        <div className="flex items-center justify-center h-14 border-b border-border">
          {collapsed ? (
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-[#001917] font-bold text-xs">P</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-[#001917] font-bold text-xs">P</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">PEGASUS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveModule(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md transition-all duration-150",
                  collapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2",
                  isActive
                    ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_rgba(94,234,212,0.25)]"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated"
                )}
                title={item.label}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium truncate">{item.label}</span>}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent rounded-full shadow-[0_0_8px_#5EEAD4]" style={{ display: collapsed ? 'none' : 'block' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: AI mode + collapse */}
        <div className="p-2 border-t border-border space-y-1.5">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-elevated">
              <Brain className="w-3 h-3 text-accent" />
              <span className="text-[10px] text-muted">AI: </span>
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">{aiMode}</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-1.5 rounded text-muted hover:text-foreground hover:bg-surface-elevated transition-all"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-[1440px] mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
