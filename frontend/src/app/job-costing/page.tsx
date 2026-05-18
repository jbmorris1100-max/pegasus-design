/** Pegasus Design — Job Costing Dashboard */
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Toaster } from "@/components/ui/toast";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const PROJECT_STATUSES = [
  { value: "",             label: "All Statuses" },
  { value: "lead",         label: "Lead" },
  { value: "estimating",   label: "Estimating" },
  { value: "approved",     label: "Approved" },
  { value: "in_production",label: "In Production" },
  { value: "completed",    label: "Completed" },
  { value: "cancelled",    label: "Cancelled" },
];

function fmt$(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n) + "%";
}
function fmtHrs(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(1) + " hrs";
}

export default function JobCostingPage() {
  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [customers,    setCustomers]    = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCust,   setFilterCust]   = useState("");
  const [search,       setSearch]       = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const qs: string[] = [];
      if (filterStatus) qs.push(`status=${filterStatus}`);
      if (filterCust)   qs.push(`customer_id=${filterCust}`);
      const [report, custs] = await Promise.all([
        api.get(`/reports/job-costing${qs.length ? "?" + qs.join("&") : ""}`),
        api.get("/customers/"),
      ]);
      setData(report);
      setCustomers((custs as any).items ?? []);
    } catch (e) {
      console.error("[job-costing]", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [filterStatus, filterCust]);

  const projects: any[] = useMemo(() => {
    if (!data?.projects) return [];
    if (!search.trim()) return data.projects;
    const s = search.toLowerCase();
    return data.projects.filter((p: any) =>
      p.name.toLowerCase().includes(s) ||
      p.customer_name?.toLowerCase().includes(s)
    );
  }, [data, search]);

  const chartData = useMemo(() =>
    projects.slice(0, 12).map((p: any) => ({
      name:      p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
      Estimated: Math.round(p.estimated_total ?? 0),
      Actual:    p.actual_total != null ? Math.round(p.actual_total) : null,
    })),
  [projects]);

  const summary = data?.summary ?? {};

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading job costing data…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Job Costing</h1>
            <p className="page-subtitle">Estimated vs actual — per project variance analysis</p>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Total Revenue"
            value={fmt$(summary.total_revenue)}
            status="ok"
          />
          <KpiCard
            label="Avg Margin"
            value={fmtPct(summary.avg_margin_pct)}
            status={
              summary.avg_margin_pct == null ? "ok"
              : summary.avg_margin_pct < 25 ? "bad"
              : summary.avg_margin_pct < 35 ? "warn"
              : "ok"
            }
          />
          <KpiCard label="Total Labor Hours"    value={fmtHrs(summary.total_labor_hours)} />
          <KpiCard label="Total Material Cost"  value={fmt$(summary.total_material_cost)} />
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects or customers…"
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-foreground placeholder:text-muted focus:outline-none focus:border-[rgba(94,234,212,0.3)]"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-foreground focus:outline-none focus:border-[rgba(94,234,212,0.3)] appearance-none"
            >
              {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              value={filterCust}
              onChange={e => setFilterCust(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-foreground focus:outline-none focus:border-[rgba(94,234,212,0.3)] appearance-none"
            >
              <option value="">All Customers</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={fetchData}>Refresh</Button>
          </div>
        </Card>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <Card>
            <div className="section-header mb-4">Estimated vs Actual — Top Projects</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(94,234,212,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#5F6F6C", fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#5F6F6C", fontSize: 9 }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "#0a0d10", border: "1px solid rgba(94,234,212,0.2)", borderRadius: 8 }}
                  labelStyle={{ color: "#E6F0EE", fontSize: 11 }}
                  itemStyle={{ fontSize: 11 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: "#5F6F6C", paddingTop: 8 }} />
                <Bar dataKey="Estimated" fill="rgba(94,234,212,0.25)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual"    fill="#5EEAD4"               radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Projects Table */}
        <Card>
          <div className="section-header mb-4">Project Detail ({projects.length})</div>
          {projects.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No projects match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted uppercase tracking-wider border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold">Project</th>
                    <th className="text-left py-2 px-2 font-semibold">Customer</th>
                    <th className="text-left py-2 px-2 font-semibold">Status</th>
                    <th className="text-right py-2 px-2 font-semibold">Est. Total</th>
                    <th className="text-right py-2 px-2 font-semibold">Act. Total</th>
                    <th className="text-right py-2 px-2 font-semibold">Variance</th>
                    <th className="text-right py-2 px-2 font-semibold">Est. Margin</th>
                    <th className="text-right py-2 px-2 font-semibold">Act. Margin</th>
                    <th className="text-right py-2 px-2 font-semibold">Est. Labor</th>
                    <th className="text-right py-2 px-2 font-semibold">Act. Labor</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p: any) => {
                    const overBudget = p.variance != null && p.variance > 0;
                    const underBudget = p.variance != null && p.variance < 0;
                    const varianceColor = overBudget
                      ? "text-[#F87171]"
                      : underBudget
                      ? "text-[#34D399]"
                      : "text-muted";

                    return (
                      <tr key={p.id} className="border-b border-[rgba(94,234,212,0.04)] hover:bg-surface-elevated transition-colors">
                        <td className="py-2.5 px-2 font-medium max-w-[160px]">
                          <span className="truncate block">{p.name}</span>
                        </td>
                        <td className="py-2.5 px-2 text-muted max-w-[120px]">
                          <span className="truncate block">{p.customer_name}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmt$(p.estimated_total)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmt$(p.actual_total)}</td>
                        <td className={`py-2.5 px-2 text-right font-mono font-semibold ${varianceColor}`}>
                          <div className="flex items-center justify-end gap-1">
                            {overBudget  && <TrendingUp   className="w-3 h-3" />}
                            {underBudget && <TrendingDown  className="w-3 h-3" />}
                            {p.variance == null && <Minus className="w-3 h-3" />}
                            {p.variance != null ? fmt$(Math.abs(p.variance)) : "—"}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-muted">{fmtPct(p.estimated_margin_pct)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmtPct(p.actual_margin_pct)}</td>
                        <td className="py-2.5 px-2 text-right text-muted">{fmtHrs(p.estimated_labor_hours)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmtHrs(p.actual_labor_hours)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <Toaster />
    </Shell>
  );
}
