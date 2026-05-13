/** Pegasus Design — Shared UI Components */
import React from "react";
import { cn } from "@/lib/utils";

// ── Button ────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-accent text-[#1a0900] hover:bg-accent-strong active:scale-[0.98] font-semibold",
    secondary:
      "bg-surface-elevated text-foreground border border-border hover:border-muted hover:bg-surface-elevated/80",
    ghost: "text-muted hover:text-foreground hover:bg-surface",
    danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-sm",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className, elevated = false }: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "data-card-elevated" : "data-card",
        "animate-in",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────

interface StatusBadgeProps {
  status: "healthy" | "warning" | "critical" | "ok" | string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const map: Record<string, string> = {
    healthy: "status-healthy",
    ok: "status-healthy",
    warning: "status-warning",
    critical: "status-critical",
    danger: "status-critical",
    high: "status-critical",
    medium: "status-warning",
    low: "status-healthy",
  };

  return (
    <span className={cn(map[status] || "status-pill", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || status}
    </span>
  );
}

// ── MetricCard ────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "flat";
  status?: "healthy" | "warning" | "critical";
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  status,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="metric-label">{label}</span>
        {status && <StatusBadge status={status} />}
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="metric-value">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-danger",
              trend === "flat" && "text-muted"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      {subtext && <span className="text-xs text-muted">{subtext}</span>}
    </Card>
  );
}

// ── Divider ───────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-border my-2", className)} />;
}
