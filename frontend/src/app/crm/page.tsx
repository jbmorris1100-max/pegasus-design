/** Pegasus Design — CRM: Customer Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Users, DollarSign } from "lucide-react";

export default function CrmPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"", city:"", state:"", customer_type:"RESIDENTIAL", notes:"" });

  async function fetchData() {
    try {
      const d = await api.get("/customers/");
      setItems((d as {items:any[]}).items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true); setError("");
    try {
      await fetch("/api/v1/customers/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      setModalOpen(false);
      setForm({ name:"", email:"", phone:"", city:"", state:"", customer_type:"RESIDENTIAL", notes:"" });
      await fetchData();
    } catch (e) {
      setError("Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading customers…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">CRM & Relationships</h1>
            <p className="page-subtitle">Customer intelligence and relationship tracking</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ New Customer</Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <div className="text-center py-16 text-muted">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No customers yet. Create your first customer to get started.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <Card key={c.id}>
                <h3 className="font-medium">{c.name}</h3>
                <p className="text-sm text-muted">{c.email}</p>
                <p className="text-sm text-muted">{c.phone}</p>
                <StatusBadge status={c.customer_type} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Customer">
        <FormField label="Name">
          <FormInput value={form.name} onChange={(e: any) => setForm({...form, name: e.target.value})} placeholder="Customer name" />
        </FormField>
        {error && !form.name && <p className="text-red-400 text-xs mt-1">{error}</p>}

        <FormField label="Email">
          <FormInput value={form.email} onChange={(e: any) => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
        </FormField>
        <FormField label="Phone">
          <FormInput value={form.phone} onChange={(e: any) => setForm({...form, phone: e.target.value})} placeholder="555-0100" />
        </FormField>
        <FormField label="City">
          <FormInput value={form.city} onChange={(e: any) => setForm({...form, city: e.target.value})} placeholder="City" />
        </FormField>
        <FormField label="State">
          <FormInput value={form.state} onChange={(e: any) => setForm({...form, state: e.target.value})} placeholder="State" />
        </FormField>
        <FormField label="Type">
          <FormSelect value={form.customer_type} onChange={(e: any) => setForm({...form, customer_type: e.target.value})}>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="DESIGNER">Designer</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="ARCHITECT">Architect</option>
          </FormSelect>
        </FormField>
        <FormField label="Notes">
          <FormTextarea value={form.notes} onChange={(e: any) => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
        </FormField>

        {error && form.name && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
