/** Pegasus Design — Estimating Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { FileText } from "lucide-react";

export default function EstimatingPage() {
  const [items, setItems] = useState<Array<Record<string,unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title:"", project_id:"", customer_id:"", total:"0", estimated_labor_hours:"0", estimated_material_cost:"0", target_margin:"0.40" });

  async function fetchData() { try { const d = await api.get("/estimates/"); setItems((d as {items:[]}).items); } catch {} finally { setLoading(false); } }
  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSubmitting(true); setError("");
    try {
      await fetch("/api/v1/estimates/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, total:parseFloat(form.total)||0, estimated_labor_hours:parseFloat(form.estimated_labor_hours)||0, estimated_material_cost:parseFloat(form.estimated_material_cost)||0, target_margin:parseFloat(form.target_margin)||0.40}) });
      setModalOpen(false); setForm({ title:"", project_id:"", customer_id:"", total:"0", estimated_labor_hours:"0", estimated_material_cost:"0", target_margin:"0.40" });
      setLoading(true); await fetchData();
    } catch { setError("Failed to create estimate."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading estimates…</div></Shell>;
  const total = items.reduce((s,i)=>s+((i.total as number)||0),0), approved = items.filter(i=>i.status==="approved"||i.status==="APPROVED").length;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Estimating Intelligence</h1><p className="page-subtitle">Quick-capture, AI-assisted pricing, margin analysis</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ New Estimate</Button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Total" value={items.length}/><KpiCard label="Pipeline" value={"$"+Math.round(total/1000)+"k"}/><KpiCard label="Approved" value={approved}/><KpiCard label="Avg Margin" value="36%" status="warn"/></div>
        {items.length===0 ? <Card><div className="text-center py-16 text-muted">No estimates yet.</div></Card> : (
          <div className="space-y-1">{items.map(e=>(
            <div key={e.id as string} className="data-row cursor-pointer hover:bg-surface-elevated rounded px-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium">{e.title as string}</span>{(e.revision_number as number)>1&&<span className="text-[10px] text-muted">Rev {e.revision_number as number}</span>}</div>{e.sent_at&&<div className="text-[11px] text-muted mt-0.5">Sent: {e.sent_at as string}</div>}</div><div className="flex items-center gap-3 ml-4"><span className="text-sm font-mono">${((e.total as number)||0).toLocaleString()}</span>{e.target_margin&&<span className="text-[10px] text-accent font-mono">{Math.round((e.target_margin as number)*100)}%</span>}<StatusBadge status={e.status as string}/></div></div>
          ))}</div>
        )}
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="New Estimate">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Title" required><FormInput value={form.title} onChange={(v)=>setForm({...form,title:v})} placeholder="e.g., Kitchen Cabinet Estimate" /></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="Project ID"><FormInput value={form.project_id} onChange={(v)=>setForm({...form,project_id:v})} /></FormField><FormField label="Customer ID"><FormInput value={form.customer_id} onChange={(v)=>setForm({...form,customer_id:v})} /></FormField></div>
        <div className="grid grid-cols-3 gap-3"><FormField label="Total ($)"><FormInput value={form.total} onChange={(v)=>setForm({...form,total:v})} type="number"/></FormField><FormField label="Labor Hours"><FormInput value={form.estimated_labor_hours} onChange={(v)=>setForm({...form,estimated_labor_hours:v})} type="number"/></FormField><FormField label="Material Cost"><FormInput value={form.estimated_material_cost} onChange={(v)=>setForm({...form,estimated_material_cost:v})} type="number"/></FormField></div>
        <FormField label="Target Margin"><FormInput value={form.target_margin} onChange={(v)=>setForm({...form,target_margin:v})} placeholder="0.40 = 40%" /></FormField>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Creating…":"Create Estimate"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
