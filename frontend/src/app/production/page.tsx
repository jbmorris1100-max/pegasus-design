/** Pegasus Design — Production: Shop Floor Visibility */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, LiveBadge } from "@/components/ui/core";
import { api } from "@/lib/api";
import { Wrench, Clock, AlertTriangle } from "lucide-react";

export default function ProductionPage() {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setData(await api.get("/dashboard/snapshot")); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading production data…</div></Shell>;
  if (!data) return <Shell><div className="card text-center py-16 text-danger">Failed to load.</div></Shell>;

  const departments = [
    { name: "Production", pct: 78, status: "ok" },
    { name: "Assembly", pct: 92, status: "warn" },
    { name: "Finishing", pct: 96, status: "bad" },
    { name: "Install", pct: 45, status: "ok" },
  ];

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">Production Visibility</h1><p className="page-subtitle">Real-time shop floor telemetry</p></div>
          <LiveBadge />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Active Projects" value={data.active_projects as number} />
          <KpiCard label="Labor Utilization" value={Math.round((data.labor_utilization as number)*100)+"%"} status={(data.labor_utilization as number) > 0.85 ? "bad" : (data.labor_utilization as number) > 0.7 ? "warn" : "ok"} />
          <KpiCard label="Overdue Tasks" value={data.overdue_tasks as number} status={(data.overdue_tasks as number) > 2 ? "bad" : (data.overdue_tasks as number) > 0 ? "warn" : "ok"} />
          <KpiCard label="At Risk" value={data.projects_at_risk as number} status={(data.projects_at_risk as number) > 2 ? "bad" : (data.projects_at_risk as number) > 0 ? "warn" : "ok"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Department Load */}
          <Card>
            <div className="section-header mb-4">Department Load</div>
            <div className="space-y-3">
              {departments.map((dept) => (
                <div key={dept.name}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium">{dept.name}</span><span className="font-mono text-muted">{dept.pct}%</span></div>
                  <div className="progress-bar h-2"><div style={{ width: dept.pct + "%", background: dept.status === "bad" ? "#F87171" : dept.status === "warn" ? "#FBBF24" : "#5EEAD4" }} /></div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bottlenecks */}
          <Card>
            <div className="section-header mb-4">Bottlenecks & Risks</div>
            {((data.projects_at_risk as number) || 0) === 0 ? (
              <div className="text-center py-8 text-muted text-sm">No active bottlenecks.</div>
            ) : (
              <div className="space-y-2">
                <div className="alert-warn flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Finishing queue exceeds 2-week threshold — {data.projects_at_risk as number} project{(data.projects_at_risk as number) !== 1 ? "s" : ""} at risk</span>
                </div>
                {(data.overdue_tasks as number) > 0 && (
                  <div className="alert-bad flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{data.overdue_tasks as number} overdue task{(data.overdue_tasks as number) !== 1 ? "s" : ""} requiring attention</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
