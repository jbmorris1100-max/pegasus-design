/** Pegasus Design — Core UI Components (InlineIQ Design System) */
import React from "react";
import { cn } from "@/lib/utils";

// ── Button ──────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}
export function Button({ variant = "secondary", size = "md", className, children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-accent-bright text-[#001917] font-semibold rounded-full shadow-[0_0_0_1px_rgba(45,225,201,0.6),0_0_40px_rgba(45,225,201,0.35),0_10px_40px_rgba(45,225,201,0.18)] hover:translate-y-[-1px] hover:shadow-[0_0_0_1px_rgba(45,225,201,0.8),0_0_60px_rgba(45,225,201,0.5)]",
    secondary: "bg-surface-high text-foreground border border-border rounded-full hover:border-border-strong hover:bg-ops-panel",
    ghost: "text-muted hover:text-foreground hover:bg-surface-elevated rounded-full",
    danger: "bg-danger-soft text-danger border border-danger/15 rounded-full hover:bg-danger/10",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props}>{children}</button>;
}

// ── Card ────────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; className?: string; elevated?: boolean; }
export function Card({ children, className, elevated }: CardProps) {
  return (
    <div className={cn(
      elevated ? "card-elevated" : "card",
      "animate-in", className
    )}>{children}</div>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────
interface KpiCardProps { label: string; value: string | number; sub?: string; status?: "ok" | "warn" | "bad"; className?: string; }
export function KpiCard({ label, value, sub, status, className }: KpiCardProps) {
  return (
    <div className={cn("kpi-card", status === "warn" ? "warn" : status === "bad" ? "bad" : "", className)}>
      <div className="kpi-accent" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}{sub && <small>{sub}</small>}</div>
    </div>
  );
}

// ── StatusBadge ─────────────────────────────────────────────────
interface StatusBadgeProps { status: string; label?: string; className?: string; }
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const s = (status || "").toLowerCase();
  const cls = s === "healthy" || s === "ok" || s === "run" || s === "completed" || s === "green" ? "badge-run"
    : s === "warning" || s === "warn" || s === "medium" || s === "idle" || s === "amber" ? "badge-idle"
    : s === "critical" || s === "danger" || s === "dmg" || s === "high" || s === "red" ? "badge-dmg"
    : "badge-idle";
  return <span className={cn(cls, className)}>{label || status}</span>;
}

// ── Divider ─────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-border my-2", className)} />;
}

// ── LiveBadge ───────────────────────────────────────────────────
export function LiveBadge() {
  return <span className="live-badge">Live</span>;
}
