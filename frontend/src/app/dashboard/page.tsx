/** Pegasus Design — Executive Command Center Dashboard

This is the primary screen. It answers:
- What is happening right now?
- What is at risk?
- What needs attention today?
- What will limit growth next?
- What should we do next?
*/
"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/stores";
import { MetricCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Wrench,
  Truck,
  Package,
  TrendingUp,
  Brain,
  Clock,
  ArrowRight,
  Phone,
  DollarSign,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

export default function CommandCenter() {
  const { dashboard, dashboardLoading, setDashboard, setDashboardLoading } =
    useAppStore();

  useEffect(() => {
    async function fetchSnapshot() {
      setDashboardLoading(true);
      try {
        const data = await api.get("/dashboard/snapshot");
        setDashboard(data);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setDashboardLoading(false);
      }
    }
    fetchSnapshot();
    // Poll every 60 seconds
    const interval = setInterval(fetchSnapshot, 60000);
    return () => clearInterval(interval);
  }, []);

  const d = dashboard;

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-muted mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            — Operational Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            <Clock className="w-4 h-4" />
            Today&apos;s Brief
          </Button>
          <Button variant="primary" size="sm">
            <Brain className="w-4 h-4" />
            Ask AI
          </Button>
        </div>
      </div>

      {/* ── KPI Ticker ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Active Projects"
          value={d?.active_projects ?? "—"}
          icon={<Wrench className="w-4 h-4" />}
        />
        <MetricCard
          label="At Risk"
          value={d?.projects_at_risk ?? "—"}
          status={d?.projects_at_risk ? (d.projects_at_risk > 2 ? "critical" : "warning") : "healthy"}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricCard
          label="Installs This Week"
          value={d?.scheduled_installs ?? "—"}
          icon={<Truck className="w-4 h-4" />}
        />
        <MetricCard
          label="Inventory Alerts"
          value={d?.inventory_alerts ?? "—"}
          status={d?.inventory_alerts ? (d.inventory_alerts > 3 ? "warning" : "healthy") : "healthy"}
          icon={<Package className="w-4 h-4" />}
        />
        <MetricCard
          label="Labor Utilization"
          value={d?.labor_utilization ? `${(d.labor_utilization * 100).toFixed(0)}%` : "—"}
          status={
            d?.labor_utilization
              ? d.labor_utilization > 0.85
                ? "critical"
                : d.labor_utilization > 0.7
                ? "warning"
                : "healthy"
              : undefined
          }
        />
        <MetricCard
          label="Margin Health"
          value={d?.margin_health ?? "—"}
          status={d?.margin_health as "healthy" | "warning" | "critical" | undefined}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Column: At-Risk + Installs ───────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* At-Risk Projects */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                <AlertTriangle className="w-4 h-4 inline mr-2 text-warning" />
                At-Risk Projects
              </h2>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            {!d?.at_risk_projects || d.at_risk_projects.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                No projects at risk. Everything is on track.
              </div>
            ) : (
              <div className="space-y-2">
                {d.at_risk_projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-md bg-surface-elevated border border-border hover:border-muted transition-all cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {p.name}
                        </span>
                        <StatusBadge
                          status={p.risk_level}
                          label={p.risk_level}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted">
                          {p.customer_name}
                        </span>
                        <span className="text-xs text-muted">•</span>
                        <span className="text-xs text-muted">
                          Due {p.target_completion || "—"}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-muted ml-4">
                      ${p.estimated_total?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Installs This Week */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                <Truck className="w-4 h-4 inline mr-2 text-info" />
                Installs This Week
              </h2>
              <Button variant="ghost" size="sm">
                Schedule <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            {!d?.installs_this_week || d.installs_this_week.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                No installs scheduled this week.
              </div>
            ) : (
              <div className="space-y-2">
                {d.installs_this_week.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 rounded-md bg-surface-elevated border border-border"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {inst.project_name}
                      </span>
                      <div className="text-xs text-muted mt-0.5">
                        {inst.scheduled_date} — {inst.lead_installer || "Unassigned"}
                      </div>
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Column: AI Intel + Events ───────────────── */}
        <div className="space-y-5">
          {/* AI Recommendations */}
          <Card elevated>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                <Brain className="w-4 h-4 inline mr-2 text-accent" />
                AI Insights
              </h2>
              <span className="text-[10px] text-muted uppercase">
                {d?.pending_recommendations ?? 0} pending
              </span>
            </div>
            {!d?.top_recommendations || d.top_recommendations.length === 0 ? (
              <div className="text-center py-6 text-muted text-sm">
                <Brain className="w-6 h-6 mx-auto mb-2 opacity-50" />
                AI is learning your business patterns.
                <br />
                <span className="text-xs">
                  Recommendations will appear as data accumulates.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {d.top_recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-md bg-accent/5 border border-accent/10 hover:border-accent/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {rec.reasoning}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-accent font-medium">
                            {Math.round(rec.confidence * 100)}% confidence
                          </span>
                          <span className="text-[10px] text-muted">
                            {rec.expected_impact} impact
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Events Feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                <Clock className="w-4 h-4 inline mr-2" />
                Recent Activity
              </h2>
            </div>
            {!d?.recent_events || d.recent_events.length === 0 ? (
              <div className="text-center py-6 text-muted text-sm">
                No recent activity recorded.
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {d.recent_events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded text-xs hover:bg-surface-elevated transition-all"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        event.severity === "critical"
                          ? "bg-danger"
                          : event.severity === "warning"
                          ? "bg-warning"
                          : "bg-muted"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{event.event_type}</span>
                      <span className="text-muted ml-2">
                        {event.actor ? `by ${event.actor}` : ""}
                      </span>
                    </div>
                    <span className="text-muted flex-shrink-0">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Growth Signals */}
          <Card elevated>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                <TrendingUp className="w-4 h-4 inline mr-2 text-success" />
                Growth Signals
              </h2>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-healthy" />
                Capacity: Operating within range
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted" />
                Hiring: Insufficient data
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted" />
                Equipment: Insufficient data
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 w-full">
              Growth Intelligence <ArrowRight className="w-3 h-3" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
