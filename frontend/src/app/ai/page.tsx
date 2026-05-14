/** Pegasus Design — AI Insights */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { api } from "@/lib/api";
import { Brain, Lightbulb } from "lucide-react";

export default function AiPage() {
  const [recs, setRecs] = useState<Array<Record<string,unknown>>>([]);
  const [brief, setBrief] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const [r,b] = await Promise.all([api.get("/ai/recommendations"), api.get("/ai/daily-brief")]); setRecs((r as {items:[]}).items); setBrief(b); } catch {} finally { setLoading(false); }
  })(); }, []);

  async function handleAction(id:string, action:string) {
    try { await fetch(`/api/v1/ai/recommendations/${id}/${action}`,{method:"POST"}); setRecs(prev=>prev.map(r=>r.id===id?{...r,status:action==="accept"?"accepted":"dismissed"}:r)); } catch {}
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading AI insights…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div><h1 className="page-title">AI Insights</h1><p className="page-subtitle">Operational intelligence engine — recommendations, briefs, analysis</p></div>

        {brief && (
          <Card elevated>
            <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-accent" /><span className="section-header">Daily Brief</span><span className="text-[10px] text-muted font-mono">{brief.date as string}</span></div>
            <p className="text-sm text-muted-bright">{(brief.content as Record<string,unknown>)?.summary as string || "No brief generated for today."}</p>
          </Card>
        )}

        <div className="section-header flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5" /> Recommendations ({recs.length})</div>
        {recs.length === 0 ? (
          <Card><div className="text-center py-12 text-muted"><Brain className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>AI recommendations appear as Pegasus learns from your data.</p></div></Card>
        ) : (
          <div className="space-y-3">
            {recs.map((rec:Record<string,unknown>) => (
              <Card key={rec.id as string} elevated>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0"><Brain className="w-4 h-4 text-accent" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{rec.title as string}</h3><StatusBadge status={rec.status as string} /></div>
                    <p className="text-xs text-muted mt-1">{rec.reasoning as string}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]">
                      <span className="text-accent font-medium">{Math.round((rec.confidence as number)*100)}% confidence</span>
                      <span className="text-muted capitalize">{rec.expected_impact as string} impact</span>
                      <span className="text-muted">{rec.category as string}</span>
                    </div>
                    {(rec.status as string) === "pending" && (
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={()=>handleAction(rec.id as string,"accept")} className="text-[11px] font-medium text-accent hover:text-accent-bright">Accept</button>
                        <button onClick={()=>handleAction(rec.id as string,"dismiss")} className="text-[11px] text-muted hover:text-foreground">Dismiss</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
