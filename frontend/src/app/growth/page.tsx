/** Pegasus Design — Growth Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card } from "@/components/ui/core";
import { api } from "@/lib/api";
import { TrendingUp, Users, Wrench } from "lucide-react";

export default function GrowthPage() {
  const [signals, setSignals] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setSignals(await api.get("/ai/growth/signals")); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading growth data…</div></Shell>;
  if (!signals) return <Shell><div className="card text-center py-16 text-danger">Failed to load.</div></Shell>;

  const hiring = (signals.hiring_signals as Array<Record<string,unknown>>) || [];
  const equipment = (signals.equipment_signals as Array<Record<string,unknown>>) || [];
  const warnings = (signals.capacity_warnings as string[]) || [];
  const forecast = signals.growth_forecast as Record<string,unknown>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div><h1 className="page-title">Growth Intelligence</h1><p className="page-subtitle">Scaling insights, hiring signals, equipment ROI</p></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard label="Hiring Signals" value={hiring.length} status={hiring.length > 0 ? "warn" : "ok"} />
          <KpiCard label="Equipment Signals" value={equipment.length} status={equipment.length > 0 ? "warn" : "ok"} />
          <KpiCard label="Capacity Warnings" value={warnings.length} status={warnings.length > 0 ? "bad" : "ok"} />
        </div>

        <Card>
          <div className="section-header mb-3">Growth Forecast</div>
          <p className="text-sm text-muted-bright">{forecast?.summary as string || "Insufficient data."}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="section-header mb-3 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Hiring Signals</div>
            {hiring.length === 0 ? <p className="text-sm text-muted">No hiring signals at this time.</p> : hiring.map((s,i)=><div key={i} className="alert-info mb-2 text-sm">{s.description as string}<div className="text-[11px] mt-1 font-medium">{s.recommendation as string}</div></div>)}
          </Card>
          <Card>
            <div className="section-header mb-3 flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> Equipment Signals</div>
            {equipment.length === 0 ? <p className="text-sm text-muted">No equipment signals.</p> : equipment.map((s,i)=><div key={i} className="alert-info mb-2 text-sm">{s.description as string}<div className="text-[11px] mt-1 font-medium">{s.recommendation as string}</div></div>)}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
