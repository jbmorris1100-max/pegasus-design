/** Pegasus Design — Install Management */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Truck, Calendar, User, MapPin } from "lucide-react";

export default function InstallsPage() {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ project_id:"", scheduled_date:"", lead_installer:"", crew_members:"", notes:"", address:"" });

  useEffect(() => { (async () => { try { setData(await api.get("/dashboard/snapshot")); } catch {} finally { setLoading(false); } })(); }, []);

  async function handleSubmit() {
    if (!form.project_id.trim()) { setError("Project ID is required."); return; }
    setSubmitting(true); setError("");
    try { await fetch("/api/v1/installs/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) }); setModalOpen(false); setForm({ project_id:"", scheduled_date:"", lead_installer:"", crew_members:"", notes:"", address:"" }); }
    catch { setError("Failed to create install."); } finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading installs…</div></Shell>;
  const installs = (data?.installs_this_week as Array<Record<string,unknown>>) || [];

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Install Management</h1><p className="page-subtitle">Scheduling, crew coordination, and site management</p></div><div className="flex items-center gap-3"><span className="live-badge">Active</span><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ Schedule Install</Button></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="This Week" value={data?.scheduled_installs as number||0}/><KpiCard label="In Progress" value="2"/><KpiCard label="Completed MTD" value="4"/><KpiCard label="Issue Rate" value="5%" status="ok"/></div>
        {installs.length===0 ? <Card><div className="text-center py-16 text-muted"><Truck className="w-10 h-10 mx-auto mb-3 opacity-20"/><p>No installs this week.</p></div></Card> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{installs.map((inst: any)=>(
            <Card key={inst.id as string}><div className="flex items-start justify-between mb-3"><h3 className="text-sm font-semibold">{inst.project_name as string}</h3><StatusBadge status={inst.status as string}/></div><div className="space-y-2 text-[12px]"><div className="flex items-center gap-2 text-muted"><Calendar className="w-3.5 h-3.5"/><span>{inst.scheduled_date as string}</span></div><div className="flex items-center gap-2 text-muted"><User className="w-3.5 h-3.5"/><span>{inst.lead_installer as string||"Unassigned"}</span></div>{inst.address&&<div className="flex items-center gap-2 text-muted"><MapPin className="w-3.5 h-3.5"/><span>{inst.address as string}</span></div>}</div><div className="mt-4 pt-3 border-t border-border"><div className="text-[10px] text-muted uppercase tracking-wider mb-1">Crew</div><div className="flex items-center gap-2"><span className="badge-run">Lead</span><span className="badge-idle text-[10px]">+2 assigned</span></div></div></Card>
          ))}</div>
        )}
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Schedule Install">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Project ID" required><FormInput value={form.project_id} onChange={(v)=>setForm({...form,project_id:v})} placeholder="UUID of the project"/></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="Scheduled Date"><FormInput value={form.scheduled_date} onChange={(v)=>setForm({...form,scheduled_date:v})} type="date"/></FormField><FormField label="Lead Installer"><FormInput value={form.lead_installer} onChange={(v)=>setForm({...form,lead_installer:v})} placeholder="Email or name"/></FormField></div>
        <FormField label="Crew Members"><FormInput value={form.crew_members} onChange={(v)=>setForm({...form,crew_members:v})} placeholder="Comma-separated names"/></FormField>
        <FormField label="Address"><FormInput value={form.address} onChange={(v)=>setForm({...form,address:v})} placeholder="Install site address"/></FormField>
        <FormField label="Notes"><FormTextarea value={form.notes} onChange={(v)=>setForm({...form,notes:v})}/></FormField>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Scheduling…":"Schedule Install"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
