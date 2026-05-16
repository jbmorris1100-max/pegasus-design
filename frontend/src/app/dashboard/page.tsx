/** Pegasus Design — Executive Command Center (InlineIQ Split-Panel) */
"use client";

import React, { useEffect, useState } from "react";
import { useAppStore, type DashboardSnapshot } from "@/stores";
import { KpiCard, Card, StatusBadge, Button, LiveBadge } from "@/components/ui/core";
import { api } from "@/lib/api";
import { Brain, AlertTriangle, Wrench, Truck, Package, TrendingUp } from "lucide-react";

export default function CommandCenter() {
  const { dashboard, dashboardLoading, setDashboard, setDashboardLoading, acceptRecommendation, dismissRecommendation } = useAppStore();
  const d = dashboard;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function fetchSnapshot() {
      setDashboardLoading(true);
      try { const data = await api.get("/dashboard/snapshot"); setDashboard(data as DashboardSnapshot); }
      catch (e) { console.error(e); setDashboardLoading(false); }
    }
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleAcceptRecommendation(id: string) {
    try {
      await api.post(`/ai/recommendations/${id}/accept`);
      acceptRecommendation(id);
    } catch (e) { console.error("accept rec:", e); }
  }
  async function handleDismissRecommendation(id: string) {
    try {
      await api.post(`/ai/recommendations/${id}/dismiss`);
      dismissRecommendation(id);
    } catch (e) { console.error("dismiss rec:", e); }
  }

  return (
    <div className="space-y-5 animate-in">
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="page-title">Command Center</h1>
            <p className="page-subtitle">
              {now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "——"} — Operational Overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          <span className="text-[11px] text-muted font-mono">
            {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Active Projects" value={d?.active_projects ?? "—"} />
        <KpiCard label="At Risk" value={d?.projects_at_risk ?? "—"} status={(d?.projects_at_risk ?? 0) > 2 ? "bad" : (d?.projects_at_risk ?? 0) > 0 ? "warn" : "ok"} />
        <KpiCard label="Installs This Week" value={d?.scheduled_installs ?? "—"} />
        <KpiCard label="Inventory Alerts" value={d?.inventory_alerts ?? "—"} status={(d?.inventory_alerts ?? 0) > 3 ? "warn" : "ok"} />
        <KpiCard label="Labor Util" value={d?.labor_utilization ? Math.round(d.labor_utilization * 100) + "%" : "—"} status={(d?.labor_utilization ?? 0) > 0.85 ? "bad" : (d?.labor_utilization ?? 0) > 0.7 ? "warn" : "ok"} />
        <KpiCard label="Margin Health" value={d?.margin_health ?? "—"} status={d?.margin_health === "critical" ? "bad" : d?.margin_health === "warning" ? "warn" : "ok"} />
      </div>

      {/* ── Split Panel Layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3: At-Risk Projects + Installs */}
        <div className="lg:col-span-2 space-y-4">
          {/* At-Risk Projects Panel */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="section-header flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                At-Risk Projects
              </div>
              <span className="text-[10px] text-accent font-mono">{d?.at_risk_projects?.length ?? 0} projects</span>
            </div>
            {!d?.at_risk_projects?.length ? (
              <div className="text-center py-8 text-muted text-sm">No projects at risk — everything is on track.</div>
            ) : (
              <div className="space-y-1">
                {d.at_risk_projects.map((p) => (
                  <div key={p.id} className="data-row cursor-pointer hover:bg-surface-elevated rounded px-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <span className="text-[11px] text-muted">{p.project_type}</span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {p.customer_name || "—"} · Due {p.target_completion || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-mono text-muted">${(p.estimated_total || 0).toLocaleString()}</span>
                      <StatusBadge status={p.risk_level} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Installs This Week Panel */}
          <Card>
            <div className="section-header flex items-center gap-2 mb-3">
              <Truck className="w-3.5 h-3.5 text-accent" />
              Installs This Week
            </div>
            {!d?.installs_this_week?.length ? (
              <div className="text-center py-6 text-muted text-sm">No installs scheduled this week.</div>
            ) : (
              <div className="space-y-1">
                {d.installs_this_week.map((inst) => (
                  <div key={inst.id} className="data-row rounded px-2">
                    <div>
                      <span className="text-sm font-medium">{inst.project_name}</span>
                      <div className="text-[11px] text-muted mt-0.5">
                        {inst.scheduled_date} — {inst.lead_installer || "Unassigned"}
                        {inst.address ? ` · ${inst.address}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Events Feed */}
          <Card>
            <div className="section-header mb-3">Recent Activity</div>
            {!d?.recent_events?.length ? (
              <div className="text-center py-6 text-muted text-sm">No recent activity.</div>
            ) : (
              <div className="space-y-0 max-h-[200px] overflow-y-auto">
                {d.recent_events.slice(0, 15).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 py-1.5 text-[11px]">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.severity === "critical" ? "bg-danger" : ev.severity === "warning" ? "bg-warning" : "bg-muted"}`} />
                    <span className="font-medium">{ev.event_type}</span>
                    {ev.actor && <span className="text-muted">by {ev.actor}</span>}
                    <span className="text-muted ml-auto font-mono text-[10px]">
                      {ev.created_at ? new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right 1/3: AI Insights + Growth */}
        <div className="space-y-4">
          {/* AI Recommendations */}
          <Card elevated>
            <div className="flex items-center justify-between mb-3">
              <div className="section-header flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-accent" />
                AI Insights
              </div>
              <span className="text-[10px] text-accent font-mono">{d?.pending_recommendations ?? 0} pending</span>
            </div>
            {!d?.top_recommendations?.length ? (
              <div className="text-center py-6 text-muted text-sm">AI is learning your business patterns.</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {d.top_recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg bg-accent-soft/50 border border-accent/10 hover:border-accent/20 transition-all">
                    <div className="flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-[11px] text-muted mt-1 line-clamp-2">{rec.reasoning}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-accent font-medium">{Math.round(rec.confidence * 100)}%</span>
                          <span className="text-[10px] text-muted">{rec.expected_impact}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleAcceptRecommendation(rec.id)}
                            className="text-[11px] font-medium text-accent hover:text-accent-bright transition-colors"
                          >Accept</button>
                          <button
                            onClick={() => handleDismissRecommendation(rec.id)}
                            className="text-[11px] text-muted hover:text-foreground transition-colors"
                          >Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Growth Signals */}
          <Card>
            <div className="section-header flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              Growth Signals
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-muted-bright">Capacity:</span>
                <span>{d?.capacity_status === "ok" ? "Within range" : d?.capacity_status === "warning" ? "Approaching limit" : "Critical"}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                <span className="text-muted-bright">Hiring:</span>
                <span>{(d?.labor_utilization ?? 0) > 0.85 ? "Pressure detected" : "No signals"}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                <span className="text-muted-bright">Equipment:</span>
                <span>{d?.projects_at_risk && d.projects_at_risk > 1 ? "Review recommended" : "No signals"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
