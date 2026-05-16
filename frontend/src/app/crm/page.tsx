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
      await api.post("/customers/", form);
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
          <FormInput
            value={form.name}
            onChange={(val) => setForm({...form, name: val})}
            placeholder="Customer name"
          />
        </FormField>
        {error && !form.name && <p className="text-red-400 text-xs mt-1">{error}</p>}

        <FormField label="Email">
          <FormInput
            value={form.email}
            onChange={(val) => setForm({...form, email: val})}
            placeholder="email@example.com"
          />
        </FormField>
        <FormField label="Phone">
          <FormInput
            value={form.phone}
            onChange={(val) => setForm({...form, phone: val})}
            placeholder="555-0100"
          />
        </FormField>
        <FormField label="City">
          <FormInput
            value={form.city}
            onChange={(val) => setForm({...form, city: val})}
            placeholder="City"
          />
        </FormField>
        <FormField label="State">
          <FormInput
            value={form.state}
            onChange={(val) => setForm({...form, state: val})}
            placeholder="State"
          />
        </FormField>
        <FormField label="Type">
          <FormSelect
            value={form.customer_type}
            onChange={(val) => setForm({...form, customer_type: val})}
            options={[
              { value: "RESIDENTIAL", label: "Residential" },
              { value: "COMMERCIAL", label: "Commercial" },
              { value: "DESIGNER", label: "Designer" },
              { value: "CONTRACTOR", label: "Contractor" },
              { value: "ARCHITECT", label: "Architect" },
            ]}
          />
        </FormField>
        <FormField label="Notes">
          <FormTextarea
            value={form.notes}
            onChange={(val) => setForm({...form, notes: val})}
            placeholder="Optional notes"
          />
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
