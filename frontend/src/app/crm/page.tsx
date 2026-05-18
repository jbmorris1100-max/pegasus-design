/** Pegasus Design — CRM: Customer Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, SlidePanel, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { Toaster, toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Users, Mail, Phone, MapPin } from "lucide-react";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
  { value: "designer",    label: "Designer" },
  { value: "contractor",  label: "Contractor" },
  { value: "architect",   label: "Architect" },
];

const CUSTOMER_STATUSES = [
  { value: "lead",     label: "Lead" },
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const emptyForm = {
  name: "", email: "", phone: "", city: "", state: "",
  zip_code: "", address_line1: "", customer_type: "residential", notes: "",
};

export default function CrmPage() {
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm]             = useState(emptyForm);

  // Detail / edit slide panel
  const [panelOpen, setPanelOpen]           = useState(false);
  const [selected, setSelected]             = useState<any>(null);
  const [editForm, setEditForm]             = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  async function fetchData() {
    try {
      const d = await api.get("/customers/");
      setItems((d as { items: any[] }).items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError("Name is required."); return; }
    setSubmitting(true); setCreateError("");
    try {
      await api.post("/customers/", form);
      setCreateOpen(false);
      setForm(emptyForm);
      await fetchData();
      toast("Customer created");
    } catch {
      setCreateError("Failed to create customer.");
      toast("Failed to create customer", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function openPanel(id: string) {
    setPanelOpen(true);
    setSelected(null);
    try {
      const d = await api.get(`/customers/${id}`);
      setSelected(d);
      setEditForm({
        name:          (d as any).name ?? "",
        email:         (d as any).email ?? "",
        phone:         (d as any).phone ?? "",
        city:          (d as any).city ?? "",
        state:         (d as any).state ?? "",
        zip_code:      (d as any).zip_code ?? "",
        address_line1: (d as any).address_line1 ?? "",
        customer_type: (d as any).customer_type ?? "residential",
        status:        (d as any).status ?? "active",
        notes:         (d as any).notes ?? "",
      });
    } catch {
      toast("Failed to load customer", "error");
      setPanelOpen(false);
    }
  }

  async function handleSave() {
    if (!editForm.name?.trim()) { toast("Name is required", "error"); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/customers/${selected.id}`, editForm);
      setPanelOpen(false);
      await fetchData();
      toast("Customer saved");
    } catch {
      toast("Failed to save customer", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Archive ${selected.name}? They will be marked inactive but not removed.`)) return;
    setDeleting(true);
    try {
      await api.put(`/customers/${selected.id}`, { status: "archived" });
      setPanelOpen(false);
      await fetchData();
      toast("Customer archived");
    } catch {
      toast("Failed to archive customer", "error");
    } finally {
      setDeleting(false);
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
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>+ New Customer</Button>
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
              <Card
                key={c.id}
                className="cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => openPanel(c.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{c.name}</h3>
                  <StatusBadge status={c.status} />
                </div>
                {c.email && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                    <Mail className="w-3 h-3" />{c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                    <Phone className="w-3 h-3" />{c.phone}
                  </div>
                )}
                {(c.city || c.state) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                    <MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <StatusBadge status={c.customer_type || c.type} />
                  {c.total_revenue > 0 && (
                    <span className="text-[11px] font-mono text-accent">${c.total_revenue.toLocaleString()}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Customer">
        {createError && <p className="text-red-400 text-xs mb-3">{createError}</p>}
        <FormField label="Name" required>
          <FormInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Customer name" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email">
            <FormInput value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@example.com" />
          </FormField>
          <FormField label="Phone">
            <FormInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="555-0100" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="City">
            <FormInput value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="City" />
          </FormField>
          <FormField label="State">
            <FormInput value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="State" />
          </FormField>
        </div>
        <FormField label="Type">
          <FormSelect value={form.customer_type} onChange={(v) => setForm({ ...form, customer_type: v })} options={CUSTOMER_TYPES} />
        </FormField>
        <FormField label="Notes">
          <FormTextarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Optional notes" />
        </FormField>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      {/* ── Detail / Edit Slide Panel ─────────────────────── */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={selected?.name ?? "Customer Details"}>
        {!selected ? (
          <p className="text-muted text-sm py-4 text-center">Loading…</p>
        ) : (
          <>
            {/* Summary row */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[rgba(94,234,212,0.08)]">
              <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
                <span className="text-accent font-semibold text-sm">{selected.name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <div className="font-semibold text-sm">{selected.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  {selected.total_projects || 0} projects · ${(selected.total_revenue || 0).toLocaleString()} revenue
                </div>
              </div>
            </div>

            <FormField label="Name" required>
              <FormInput value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email">
                <FormInput value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} />
              </FormField>
              <FormField label="Phone">
                <FormInput value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
              </FormField>
            </div>
            <FormField label="Address">
              <FormInput value={editForm.address_line1} onChange={(v) => setEditForm({ ...editForm, address_line1: v })} placeholder="Street address" />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="City">
                <FormInput value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} />
              </FormField>
              <FormField label="State">
                <FormInput value={editForm.state} onChange={(v) => setEditForm({ ...editForm, state: v })} />
              </FormField>
              <FormField label="Zip">
                <FormInput value={editForm.zip_code} onChange={(v) => setEditForm({ ...editForm, zip_code: v })} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <FormSelect value={editForm.customer_type} onChange={(v) => setEditForm({ ...editForm, customer_type: v })} options={CUSTOMER_TYPES} />
              </FormField>
              <FormField label="Status">
                <FormSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={CUSTOMER_STATUSES} />
              </FormField>
            </div>
            <FormField label="Notes">
              <FormTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} />
            </FormField>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(94,234,212,0.08)]">
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Archiving…" : "Archive"}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave} disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </SlidePanel>

      <Toaster />
    </Shell>
  );
}
