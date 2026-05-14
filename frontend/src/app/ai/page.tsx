"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/core";

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
        setBrief(b);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAction(id: string, action: string) {
    await api.post("/ai/recommendations", { id, action });
    const r = await api.get("/ai/recommendations");
    setRecs((r as any).items ?? []);
  }

  if (loading) return <div className="p-6">Loading AI insights…</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">AI Advisor</h1>
      {brief && (
        <Card highlight="teal">
          <h2 className="text-lg font-semibold">Today's Brief</h2>
          <p className="text-sm text-muted mt-2">{(brief as any).summary}</p>
        </Card>
      )}
      <div className="grid gap-4">
        {recs.map((rec: any, i: number) => (
          <Card key={i}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{rec.title}</h3>
                <p className="text-sm text-muted">{rec.description}</p>
                <span className="text-xs text-teal">Confidence: {rec.confidence}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(rec.id, "accept")}
                  className="px-3 py-1 bg-teal-600 text-black rounded text-xs"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleAction(rec.id, "dismiss")}
                  className="px-3 py-1 border border-dim rounded text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
