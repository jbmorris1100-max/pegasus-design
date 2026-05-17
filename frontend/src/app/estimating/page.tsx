/** Pegasus Design — Estimating Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { api } from "@/lib/api";

const ESTIMATE_STATUSES = [
  { value: "draft",    label: "Draft" },
  { value: "sent",     label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired",  label: "Expired" },
];

const emptyForm = { title: "", project_id: "", customer_id: "", total: "0", estimated_labor_hours: "0", estimated_material_cost: "0", target_margin: "0.40" };

export default function EstimatingPage() {
  const [items, setItems]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm]           = useState(emptyForm);

  // Detail / edit
  const [detailOpen, setDetailOpen]         = useState(false);
  const [selected, setSelected]             = useState<any>(null);
  const [editForm, setEditForm]             = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError]           = useState("");
  const [deleting, setDeleting]             = useState(false);

  async function fetchData() {
    try {
      const d = await api.get("/estimates/");
      setItems((d as { items: any[] }).items);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSubmitting(true); setError("");
    try {
      await api.post("/estimates/", {
        ...form,
        total: parseFloat(form.total) || 0,
        estimated_labor_hours: parseFloat(form.estimated_labor_hours) || 0,
        estimated_material_cost: parseFloat(form.estimated_material_cost) || 0,
        target_margin: parseFloat(form.target_margin) || 0.40,
      });
      setModalOpen(false);
      setForm(emptyForm);
      setLoading(true);
      await fetchData();
    } catch { setError("Failed to create estimate."); }
    finally { setSubmitting(false); }
  }

  async function openDetail(id: string) {
    setDetailOpen(true);
    setSelected(null);
    setEditError("");
    try {
      const d = await api.get(`/estimates/${id}`);
      setSelected(d);
      setEditForm({
        title:                   (d as any).title ?? "",
        status:                  (d as any).status ?? "draft",
        project_id:              (d as any).project_id ?? "",
        customer_id:             (d as any).customer_id ?? "",
        total:                   String((d as any).total ?? "0"),
        estimated_labor_hours:   String((d as any).estimated_labor_hours ?? "0"),
        estimated_material_cost: String((d as any).estimated_material_cost ?? "0"),
        target_margin:           String((d as any).target_margin ?? "0.40"),
        notes:                   (d as any).notes ?? "",
        terms:                   (d as any).terms ?? "",
      });
    } catch {
      setEditError("Failed to load estimate.");
    }
  }

  async function handleEditSubmit() {
    if (!editForm.title?.trim()) { setEditError("Title is required."); return; }
    setEditSubmitting(true); setEditError("");
    try {
      await api.put(`/estimates/${selected.id}`, {
        ...editForm,
        total: parseFloat(editForm.total) || 0,
        estimated_labor_hours: parseFloat(editForm.estimated_labor_hours) || 0,
        estimated_material_cost: parseFloat(editForm.estimated_material_cost) || 0,
        target_margin: parseFloat(editForm.target_margin) || 0.40,
      });
      setDetailOpen(false);
      await fetchData();
    } catch {
      setEditError("Failed to update estimate.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/estimates/${selected.id}`);
      setDetailOpen(false);
      await fetchData();
    } catch {
      setEditError("Failed to delete estimate.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading estimates…</div></Shell>;

  const total = items.reduce((s, i) => s + ((i.total as number) || 0), 0);
  const approved = items.filter(i => i.status === "approved").length;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">Estimating Intelligence</h1><p className="page-subtitle">Quick-capture, AI-assisted pricing, margin analysis</p></div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ New Estimate</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total" value={items.length} />
          <KpiCard label="Pipeline" value={"$" + Math.round(total / 1000) + "k"} />
          <KpiCard label="Approved" value={approved} />
          <KpiCard label="Avg Margin" value="36%" status="warn" />
        </div>

        {items.length === 0 ? (
          <Card><div className="text-center py-16 text-muted">No estimates yet.</div></Card>
        ) : (
          <div className="space-y-1">
            {items.map((e: any) => (
              <div
                key={e.id}
                className="data-row cursor-pointer hover:bg-surface-elevated rounded px-3"
                onClick={() => openDetail(e.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.title}</span>
                    {e.revision_number > 1 && <span className="text-[10px] text-muted">Rev {e.revision_number}</span>}
                  </div>
                  {e.sent_at && <div className="text-[11px] text-muted mt-0.5">Sent: {e.sent_at}</div>}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-mono">${((e.total as number) || 0).toLocaleString()}</span>
                  {e.target_margin && <span className="text-[10px] text-accent font-mono">{Math.round((e.target_margin as number) * 100)}%</span>}
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Estimate">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Title" required>
          <FormInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g., Kitchen Cabinet Estimate" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Project ID">
            <FormInput value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} />
          </FormField>
          <FormField label="Customer ID">
            <FormInput value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Total ($)">
            <FormInput value={form.total} onChange={(v) => setForm({ ...form, total: v })} type="number" />
          </FormField>
          <FormField label="Labor Hours">
            <FormInput value={form.estimated_labor_hours} onChange={(v) => setForm({ ...form, estimated_labor_hours: v })} type="number" />
          </FormField>
          <FormField label="Material Cost">
            <FormInput value={form.estimated_material_cost} onChange={(v) => setForm({ ...form, estimated_material_cost: v })} type="number" />
          </FormField>
        </div>
        <FormField label="Target Margin">
          <FormInput value={form.target_margin} onChange={(v) => setForm({ ...form, target_margin: v })} placeholder="0.40 = 40%" />
        </FormField>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating…" : "Create Estimate"}</Button>
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Detail / Edit Modal ───────────────────────────── */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.title ?? "Estimate Details"}>
        {!selected && !editError && <p className="text-muted text-sm py-4 text-center">Loading…</p>}
        {editError && <p className="text-red-400 text-xs mb-3">{editError}</p>}
        {selected && (
          <>
            <FormField label="Title" required>
              <FormInput value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
            </FormField>
            <FormField label="Status">
              <FormSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={ESTIMATE_STATUSES} />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Total ($)">
                <FormInput value={editForm.total} onChange={(v) => setEditForm({ ...editForm, total: v })} type="number" />
              </FormField>
              <FormField label="Labor Hours">
                <FormInput value={editForm.estimated_labor_hours} onChange={(v) => setEditForm({ ...editForm, estimated_labor_hours: v })} type="number" />
              </FormField>
              <FormField label="Material Cost">
                <FormInput value={editForm.estimated_material_cost} onChange={(v) => setEditForm({ ...editForm, estimated_material_cost: v })} type="number" />
              </FormField>
            </div>
            <FormField label="Target Margin">
              <FormInput value={editForm.target_margin} onChange={(v) => setEditForm({ ...editForm, target_margin: v })} placeholder="0.40 = 40%" />
            </FormField>
            <FormField label="Notes">
              <FormTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} />
            </FormField>
            <FormField label="Terms">
              <FormTextarea value={editForm.terms} onChange={(v) => setEditForm({ ...editForm, terms: v })} />
            </FormField>
            <div className="flex items-center justify-between mt-4 pt-2">
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDetailOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleEditSubmit} disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </Shell>
  );
}
