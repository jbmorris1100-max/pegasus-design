/** Pegasus Design — Scheduling & Capacity */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Calendar, Clock, Truck } from "lucide-react";

const BLOCK_TYPES = ["PRODUCTION","ASSEMBLY","FINISHING","INSTALL","MAINTENANCE","TRAINING","TIME_OFF"];

export default function SchedulingPage() {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title:"", block_type:"PRODUCTION", start_date:"", end_date:"", department:"", assigned_to:"", estimated_hours:"0", notes:"" });
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  useEffect(() => { (async () => { try { setData(await api.get("/dashboard/snapshot")); } catch {} finally { setLoading(false); } })(); }, []);
  useEffect(() => {
    const today = new Date();
    setWeekDays(Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d;}));
  }, []);

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSubmitting(true); setError("");
    try { await fetch("/api/v1/schedule-blocks/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, estimated_hours:parseFloat(form.estimated_hours)||0}) }); setModalOpen(false); setForm({ title:"", block_type:"PRODUCTION", start_date:"", end_date:"", department:"", assigned_to:"", estimated_hours:"0", notes:"" }); }
    catch { setError("Failed to create block."); } finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading schedule…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Scheduling & Capacity</h1><p className="page-subtitle">Production calendar and resource allocation</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ Add Block</Button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Active Projects" value={data?.active_projects as number||0}/><KpiCard label="This Week Installs" value={data?.scheduled_installs as number||0}/><KpiCard label="Labor Util" value={Math.round(((data?.labor_utilization as number)||0)*100)+"%"} status={(data?.labor_utilization as number||0)>0.85?"bad":(data?.labor_utilization as number||0)>0.7?"warn":"ok"}/><KpiCard label="Capacity" value={(data?.capacity_status as string)||"ok"} status={data?.capacity_status==="ok"?"ok":data?.capacity_status==="warning"?"warn":"bad"}/></div>
        <Card><div className="section-header mb-4 flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> This Week</div><div className="grid grid-cols-7 gap-2 text-center">{weekDays.map((d,i)=>(<div key={i} className={`p-3 rounded-lg border text-sm ${i===0?'border-accent/30 bg-accent-soft/30':i===2||i===5?'border-border bg-surface':i>5?'border-border bg-surface opacity-50':''}`}><div className="text-[10px] text-muted uppercase">{d.toLocaleDateString("en",{weekday:"short"})}</div><div className="text-lg font-semibold mt-1">{d.getDate()}</div><div className="text-[10px] text-muted mt-1">{i===0?'2 installs':i===1?'Production':i===2?'Assembly':i===3?'QC day':i===4?'Finishing':'—'}</div></div>))}</div></Card>
        <Card><div className="section-header mb-3 flex items-center gap-2"><Truck className="w-3.5 h-3.5"/> Scheduled Installs</div>{((data?.installs_this_week as unknown[])?.length||0)===0?<div className="text-center py-8 text-muted text-sm">No installs scheduled.</div>:<div className="space-y-1">{(data?.installs_this_week as Array<Record<string,unknown>>)?.map((inst: any)=>(<div key={inst.id as string} className="data-row rounded px-2"><div><span className="text-sm font-medium">{inst.project_name as string}</span><div className="text-[11px] text-muted">{inst.scheduled_date as string} — {inst.lead_installer as string||"Unassigned"}</div></div><StatusBadge status={inst.status as string}/></div>))}</div>}</Card>
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Add Schedule Block">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Title" required><FormInput value={form.title} onChange={(v)=>setForm({...form,title:v})} placeholder="e.g., Production Block 16"/></FormField>
        <FormField label="Block Type"><FormSelect value={form.block_type} onChange={(v)=>setForm({...form,block_type:v})} options={BLOCK_TYPES.map(t=>({value:t,label:t.replace(/_/g," ")}))}/></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="Start Date"><FormInput value={form.start_date} onChange={(v)=>setForm({...form,start_date:v})} type="date"/></FormField><FormField label="End Date"><FormInput value={form.end_date} onChange={(v)=>setForm({...form,end_date:v})} type="date"/></FormField></div>
        <div className="grid grid-cols-2 gap-3"><FormField label="Department"><FormInput value={form.department} onChange={(v)=>setForm({...form,department:v})} placeholder="e.g., Production"/></FormField><FormField label="Assigned To"><FormInput value={form.assigned_to} onChange={(v)=>setForm({...form,assigned_to:v})} placeholder="Email or name"/></FormField></div>
        <FormField label="Estimated Hours"><FormInput value={form.estimated_hours} onChange={(v)=>setForm({...form,estimated_hours:v})} type="number"/></FormField>
        <FormField label="Notes"><FormTextarea value={form.notes} onChange={(v)=>setForm({...form,notes:v})}/></FormField>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Adding…":"Add Block"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
