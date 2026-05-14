/** Pegasus Design — Event Timeline */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Clock } from "lucide-react";

const EVENT_TYPES = ["EstimateCreated","EstimateSent","EstimateApproved","ProjectCreated","ProjectStatusChanged","ProductionStarted","ProductionCompleted","QCPassed","QCFailed","LaborTracked","InstallScheduled","InstallCompleted","InventoryLow","CapacityWarning","Other"];
const SEVERITIES = [{value:"info",label:"Info"},{value:"warning",label:"Warning"},{value:"critical",label:"Critical"}];

export default function TimelinePage() {
  const [events, setEvents] = useState<Array<Record<string,unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ event_type:"Other", severity:"info", entity_type:"", description:"" });

  async function fetchData() { try { const d = await api.get("/events/"); setEvents((d as {items:[]}).items); } catch {} finally { setLoading(false); } }
  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (form.event_type === "Other" && !form.description.trim()) { setError("Description required for custom events."); return; }
    setSubmitting(true); setError("");
    try { await fetch("/api/v1/events/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, actor:"user"}) }); setModalOpen(false); setForm({ event_type:"Other", severity:"info", entity_type:"", description:"" }); setLoading(true); await fetchData(); }
    catch { setError("Failed to log event."); } finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading timeline…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Event Timeline</h1><p className="page-subtitle">Full operational history — {events.length} events recorded</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ Log Event</Button></div>
        {events.length===0 ? <Card><div className="text-center py-16 text-muted"><Clock className="w-10 h-10 mx-auto mb-3 opacity-20"/><p>No events recorded.</p></div></Card> : (
          <Card><div className="space-y-0 max-h-[600px] overflow-y-auto">{events.map((ev: any, i: number)=>(<div key={ev.id as string||i} className="flex items-start gap-3 py-2.5 px-2 border-b border-border last:border-b-0 hover:bg-surface-elevated transition-colors rounded"><div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ev.severity==="critical"?"bg-danger":ev.severity==="warning"?"bg-warning":"bg-muted"}`}/><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium">{ev.event_type as string}</span><StatusBadge status={ev.severity as string}/></div><div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">{ev.entity_type&&<span>{ev.entity_type as string}</span>}{ev.actor&&<span>by {ev.actor as string}</span>}</div></div><span className="text-[11px] text-muted font-mono flex-shrink-0">{ev.created_at?new Date(ev.created_at as string).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span></div>))}</div></Card>
        )}
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Log Event">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Event Type" required><FormSelect value={form.event_type} onChange={(v)=>setForm({...form,event_type:v})} options={EVENT_TYPES.map(t=>({value:t,label:t.replace(/([A-Z])/g," $1").trim()}))}/></FormField>
        <FormField label="Severity"><FormSelect value={form.severity} onChange={(v)=>setForm({...form,severity:v})} options={SEVERITIES}/></FormField>
        <FormField label="Entity Type"><FormInput value={form.entity_type} onChange={(v)=>setForm({...form,entity_type:v})} placeholder="e.g., project, estimate, install"/></FormField>
        <FormField label="Description"><FormTextarea value={form.description} onChange={(v)=>setForm({...form,description:v})} placeholder="What happened?"/></FormField>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Logging…":"Log Event"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
