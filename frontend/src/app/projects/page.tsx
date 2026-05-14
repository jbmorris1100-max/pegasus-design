/** Pegasus Design — Projects: Lifecycle Tracking */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { ClipboardList, Clock } from "lucide-react";

const PROJECT_TYPES = ["OTHER","KITCHEN","BATHROOM","BUILT_IN","CLOSET","LAUNDRY","HOME_OFFICE","ENTERTAINMENT","COMMERCIAL","CUSTOM_MILLWORK"];

export default function ProjectsPage() {
  const [items, setItems] = useState<Array<Record<string,unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", description:"", customer_id:"", project_type:"OTHER", target_completion:"", estimated_total:"0", estimated_labor_hours:"0" });

  async function fetchData() { try { const d = await api.get("/projects/"); setItems((d as {items:[]}).items); } catch {} finally { setLoading(false); } }
  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSubmitting(true); setError("");
    try {
      await fetch("/api/v1/projects/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, estimated_total:parseFloat(form.estimated_total)||0, estimated_labor_hours:parseFloat(form.estimated_labor_hours)||0}) });
      setModalOpen(false); setForm({ name:"", description:"", customer_id:"", project_type:"OTHER", target_completion:"", estimated_total:"0", estimated_labor_hours:"0" });
      setLoading(true); await fetchData();
    } catch { setError("Failed to create project."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading projects…</div></Shell>;
  const counts = { active: items.filter(i=>!["completed","cancelled"].includes(i.status as string)).length, atRisk: items.filter(i=>["high","critical"].includes(i.risk_level as string)).length };

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Project Tracking</h1><p className="page-subtitle">Full lifecycle from lead to completion</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ New Project</Button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Total" value={items.length}/><KpiCard label="Active" value={counts.active}/><KpiCard label="At Risk" value={counts.atRisk} status={counts.atRisk>2?"bad":counts.atRisk>0?"warn":"ok"}/><KpiCard label="Completed" value={items.filter(i=>i.status==="completed").length}/></div>
        {items.length===0 ? <Card><div className="text-center py-16 text-muted">No projects yet.</div></Card> : (
          <div className="space-y-1">{items.map(p=>(
            <div key={p.id as string} className="data-row cursor-pointer hover:bg-surface-elevated rounded px-3">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium truncate">{p.name as string}</span><span className="text-[11px] text-muted capitalize">{(p.project_type as string||"").replace(/_/g," ")}</span></div>{p.target_completion&&<div className="text-[11px] text-muted mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/>Due {p.target_completion as string}</div>}</div>
              <div className="flex items-center gap-3 ml-4"><span className="text-sm font-mono text-muted">${((p.estimated_total as number)||0).toLocaleString()}</span><StatusBadge status={p.status as string}/>{p.risk_level!=="low"&&<StatusBadge status={p.risk_level as string}/>}</div>
            </div>
          ))}</div>
        )}
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="New Project">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Project Name" required><FormInput value={form.name} onChange={(v)=>setForm({...form,name:v})} placeholder="e.g., Custom Kitchen Cabinetry" /></FormField>
        <FormField label="Type"><FormSelect value={form.project_type} onChange={(v)=>setForm({...form,project_type:v})} options={PROJECT_TYPES.map(t=>({value:t,label:t.replace(/_/g," ")}))} /></FormField>
        <FormField label="Customer ID (optional)"><FormInput value={form.customer_id} onChange={(v)=>setForm({...form,customer_id:v})} placeholder="UUID of existing customer" /></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="Est. Total ($)"><FormInput value={form.estimated_total} onChange={(v)=>setForm({...form,estimated_total:v})} type="number" /></FormField><FormField label="Est. Labor Hours"><FormInput value={form.estimated_labor_hours} onChange={(v)=>setForm({...form,estimated_labor_hours:v})} type="number" /></FormField></div>
        <FormField label="Target Completion"><FormInput value={form.target_completion} onChange={(v)=>setForm({...form,target_completion:v})} type="date" /></FormField>
        <FormField label="Description"><FormTextarea value={form.description} onChange={(v)=>setForm({...form,description:v})} /></FormField>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Creating…":"Create Project"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
