"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Shell } from "@/components/ui/shell";
import { Card, Button, StatusBadge } from "@/components/ui/core";
import { Brain } from "lucide-react";

export default function AiPage() {
  const [recs, setRecs] = useState<any[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, b] = await Promise.all([
          api.get("/ai/recommendations"),
          api.get("/ai/daily-brief"),
        ]);
        setRecs((r as any).items ?? []);
        setBrief(b as any);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAction(id: string, action: string) {
    try {
      await api.post(`/ai/recommendations/${id}/${action}`);
    } catch (e) { console.error("rec action:", e); }
    try {
      const r = await api.get("/ai/recommendations");
      setRecs((r as any).items ?? []);
    } catch (e) { console.error("reload recs:", e); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading AI insights…</div></Shell>;

  const briefContent = brief?.content as any;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div>
          <h1 className="page-title">AI Advisor</h1>
          <p className="page-subtitle">Recommendations, daily brief, and growth signals</p>
        </div>

        {briefContent?.summary && (
          <Card elevated>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-3.5 h-3.5 text-accent" />
              <span className="section-header">Today's Brief</span>
            </div>
            <p className="text-sm text-muted-bright">{briefContent.summary}</p>
          </Card>
        )}

        <div className="space-y-3">
          {recs.length === 0 && (
            <Card><div className="text-center py-12 text-muted">No pending recommendations.</div></Card>
          )}
          {recs.map((rec: any, i: number) => (
            <Card key={rec.id ?? i}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{rec.title}</h3>
                    <StatusBadge status={rec.expected_impact} />
                  </div>
                  <p className="text-[12px] text-muted-bright">{rec.description}</p>
                  <p className="text-[11px] text-muted mt-1">{rec.reasoning}</p>
                  <span className="text-[10px] text-accent font-mono mt-1 block">
                    Confidence: {Math.round((rec.confidence ?? 0) * 100)}%
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="primary" size="sm" onClick={() => handleAction(rec.id, "accept")}>
                    Accept
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAction(rec.id, "dismiss")}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
