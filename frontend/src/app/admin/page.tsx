/** Pegasus Design — Admin: System Configuration */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, Button, StatusBadge } from "@/components/ui/core";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores";
import { Settings, Brain, Shield } from "lucide-react";

export default function AdminPage() {
  const { aiMode, setAiMode } = useAppStore();
  const [modeLoading, setModeLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/ai/mode").then((d:unknown)=>{const m=d as {mode:string};setAiMode(m.mode as "observe"|"assist"|"automate");setLoading(false);}).catch(()=>setLoading(false)); }, []);

  async function handleSetMode(mode: string) {
    setModeLoading(true);
    try {
      await fetch("/api/v1/ai/mode", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      setAiMode(mode as "observe"|"assist"|"automate");
    } catch {} finally { setModeLoading(false); }
  }

  const modeLabels: Record<string,string> = {
    observe: "AI observes and reports insights. No automated actions.",
    assist: "AI suggests actions and drafts responses. Human approval required.",
    automate: "AI takes automatic action on low-risk, high-confidence recommendations.",
  };

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading settings…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div><h1 className="page-title">Settings & Admin</h1><p className="page-subtitle">System configuration and operational controls</p></div>

        <Card elevated>
          <div className="flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-accent" /><span className="section-header">AI Operating Mode</span></div>
          <p className="text-sm text-muted-bright mb-4">{modeLabels[aiMode]}</p>
          <div className="flex items-center gap-2">
            {["observe","assist","automate"].map(m => (
              <Button key={m} variant={aiMode === m ? "primary" : "secondary"} size="sm" onClick={() => handleSetMode(m)} disabled={modeLoading}>
                {m.charAt(0).toUpperCase()+m.slice(1)}
              </Button>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-muted">Current: <span className="font-semibold text-accent uppercase">{aiMode}</span></div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-muted" /><span className="section-header">System Status</span></div>
          <div className="space-y-3">
            {[["Environment","development"],["API","v1"],["Database","healthy"],["Redis","healthy"],["Celery Worker","running"]].map(([label,status])=>(
              <div key={label} className="flex justify-between text-sm"><span className="text-muted-bright">{label}</span>{status==="healthy"||status==="running"?<StatusBadge status={status} />:<span className="font-mono text-[12px]">{status}</span>}</div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-center py-8 text-muted"><Settings className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">User management, InlineIQ configuration, and system logs accessible here.</p></div>
        </Card>
      </div>
    </Shell>
  );
}
