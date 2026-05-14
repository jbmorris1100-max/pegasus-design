/** Pegasus Design — QC & Callbacks */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge } from "@/components/ui/core";
import { api } from "@/lib/api";
import { CheckCircle, AlertTriangle, Phone } from "lucide-react";

export default function QcPage() {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { setData(await api.get("/dashboard/snapshot")); } catch {} finally { setLoading(false); } })(); }, []);

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading QC…</div></Shell>;
  if (!data) return <Shell><div className="card text-center py-16 text-danger">Failed to load.</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div><h1 className="page-title">QC & Callbacks</h1><p className="page-subtitle">Quality control and warranty management</p></div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard label="Open Callbacks" value={data.open_callbacks as number} status={(data.open_callbacks as number) > 3 ? "bad" : (data.open_callbacks as number) > 0 ? "warn" : "ok"} />
          <KpiCard label="QC Pass Rate" value="91%" status="ok" />
          <KpiCard label="Issues This Month" value="2" status="warn" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="section-header mb-4 flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-success" /> Recent QC Checks</div>
            <div className="space-y-1">
              {[{project:"Kitchen Cabinetry",stage:"Pre-Install",result:"passed"},{project:"Bath Vanity",stage:"Finishing",result:"passed"},{project:"Wine Room",stage:"Assembly",result:"failed"}].map((qc,i)=>(
                <div key={i} className="data-row"><div><span className="text-sm">{qc.project}</span><div className="text-[11px] text-muted">{qc.stage}</div></div><StatusBadge status={qc.result} /></div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="section-header mb-4 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-warning" /> Active Callbacks</div>
            {((data.open_callbacks as number) || 0) === 0 ? (
              <div className="text-center py-8 text-muted text-sm">No open callbacks.</div>
            ) : (
              <div className="space-y-2">
                <div className="alert-warn"><AlertTriangle className="w-4 h-4" /><span>{data.open_callbacks as number} open callback{(data.open_callbacks as number) !== 1 ? "s" : ""} requiring attention</span></div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
