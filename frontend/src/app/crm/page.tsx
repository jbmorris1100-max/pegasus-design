/** Pegasus Design — CRM: Customer Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Users, DollarSign } from "lucide-react";

export default function CrmPage() {
  const [items, setItems] = useState<Array<Record<string,unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"", city:"", state:"", customer_type:"RESIDENTIAL", notes:"" });

  async function fetchData() { try { const d = await api.get("/customers/"); setItems((d as {items:[]}).items); } catch {} finally { setLoading(false); } }
  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true); setError("");
    try {
      await fetch("/api/v1/customers/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      setModalOpen(false); setForm({ name:"", email:"", phone:"", city:"", state:"", customer_type:"RESIDENTIAL", notes:"" });
      setLoading(true); await fetchData();
    } catch { setError("Failed to create customer."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading customers…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">CRM & Relationships</h1><p className="page-subtitle">Customer intelligence and relationship tracking</p></div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ New Customer</Button>
        </div>

        {items.length === 0 ? (
          <Card><div className="text-center py-16 text-muted"><Users className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No customers yet.</p></div></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c:Record<string,unknown>) => (
              <Card key={c.id as string}>
                <div className="flex items-start justify-between mb-3"><h3 className="text-sm font-semibold">{c.name as string}</h3><StatusBadge status={(c.status as string) || "active"} /></div>
                <div className="space-y-2 text-[12px] text-muted">{c.email && <div>{c.email as string}</div>}{(c.city||c.state) && <div>{[c.city,c.state].filter(Boolean).join(", ")}</div>}</div>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-[12px]"><span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-accent" />${((c.total_revenue as number)||0).toLocaleString()}</span><span>{c.total_projects as number||0} projects</span></div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Customer">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Customer Name" required><FormInput value={form.name} onChange={(v)=>setForm({...form,name:v})} placeholder="Company or individual name" /></FormField>
        <FormField label="Type"><FormSelect value={form.customer_type} onChange={(v)=>setForm({...form,customer_type:v})} options={[{value:"RESIDENTIAL",label:"Residential"},{value:"COMMERCIAL",label:"Commercial"},{value:"DESIGNER",label:"Designer"},{value:"CONTRACTOR",label:"Contractor"},{value:"ARCHITECT",label:"Architect"}]} /></FormField>
        <FormField label="Email"><FormInput value={form.email} onChange={(v)=>setForm({...form,email:v})} placeholder="email@example.com" type="email" /></FormField>
        <FormField label="Phone"><FormInput value={form.phone} onChange={(v)=>setForm({...form,phone:v})} placeholder="(555) 000-0000" /></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="City"><FormInput value={form.city} onChange={(v)=>setForm({...form,city:v})} /></FormField><FormField label="State"><FormInput value={form.state} onChange={(v)=>setForm({...form,state:v})} /></FormField></div>
        <FormField label="Notes"><FormTextarea value={form.notes} onChange={(v)=>setForm({...form,notes:v})} placeholder="Any relevant notes…" /></FormField>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating…" : "Create Customer"}</Button>
          <Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </Shell>
  );
}
