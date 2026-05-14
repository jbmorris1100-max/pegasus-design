/** Pegasus Design — Financial Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card } from "@/components/ui/core";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp } from "lucide-react";

export default function FinancialPage() {
  const [kpis, setKpis] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setKpis(await api.get("/dashboard/kpis")); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading financials…</div></Shell>;
  if (!kpis) return <Shell><div className="card text-center py-16 text-danger">Failed to load.</div></Shell>;

  const margin = kpis.margin as Record<string,unknown>;
  const revenue = kpis.revenue as Record<string,unknown>;
  const pipeline = kpis.pipeline as Record<string,unknown>;
  const quality = kpis.quality as Record<string,unknown>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div><h1 className="page-title">Financial Intelligence</h1><p className="page-subtitle">Profitability, margin tracking, and financial health</p></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Avg Margin" value={Math.round(((margin?.average as number)||0)*100)+"%"} status={((margin?.average as number)||0) < 0.35 ? "bad" : ((margin?.average as number)||0) < 0.40 ? "warn" : "ok"} sub={"target " + Math.round(((margin?.target as number)||0)*100)+"%"} />
          <KpiCard label="Current Month" value={"$"+Math.round(((revenue?.current_month as number)||0)/1000)+"k"} />
          <KpiCard label="Prev Month" value={"$"+Math.round(((revenue?.previous_month as number)||0)/1000)+"k"} />
          <KpiCard label="Revenue Trend" value={revenue?.trend as string || "flat"} status={revenue?.trend === "up" ? "ok" : "warn"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="section-header mb-4">Pipeline</div>
            <div className="space-y-3">
              {[["Leads","leads"],["Estimating","estimating"],["Approved","approved"],["In Production","in_production"]].map(([label,key]) => (
                <div key={key} className="flex justify-between text-sm"><span className="text-muted-bright">{label}</span><span className="font-mono font-medium">{pipeline?.[key] as number || 0}</span></div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="section-header mb-4">Quality Metrics</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-bright">QC Pass Rate</span><span className="font-mono text-success">{Math.round(((quality?.qc_pass_rate as number)||0)*100)}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-bright">Callback Rate</span><span className="font-mono">{Math.round(((quality?.callback_rate as number)||0)*100)}%</span></div>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
