/** Pegasus Design — Projects: Lifecycle Tracking */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, SlidePanel, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { Toaster, toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { FileManager } from "@/components/FileManager";
import { Clock } from "lucide-react";

type PanelTab = "details" | "files";

const PROJECT_TYPES = [
  { value: "other",           label: "Other" },
  { value: "kitchen",         label: "Kitchen" },
  { value: "bathroom",        label: "Bathroom" },
  { value: "built_in",        label: "Built-In" },
  { value: "closet",          label: "Closet" },
  { value: "laundry",         label: "Laundry" },
  { value: "home_office",     label: "Home Office" },
  { value: "entertainment",   label: "Entertainment" },
  { value: "commercial",      label: "Commercial" },
  { value: "custom_millwork", label: "Custom Millwork" },
];

const PROJECT_STATUSES = [
  { value: "lead",              label: "Lead" },
  { value: "estimating",        label: "Estimating" },
  { value: "estimate_sent",     label: "Estimate Sent" },
  { value: "approved",          label: "Approved" },
  { value: "in_production",     label: "In Production" },
  { value: "finishing",         label: "Finishing" },
  { value: "ready_for_install", label: "Ready for Install" },
  { value: "installing",        label: "Installing" },
  { value: "completed",         label: "Completed" },
  { value: "on_hold",           label: "On Hold" },
  { value: "cancelled",         label: "Cancelled" },
];

const RISK_LEVELS = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

const emptyForm = {
  name: "", description: "", customer_id: "", project_type: "other",
  target_completion: "", estimated_total: "0", estimated_labor_hours: "0",
};

export default function ProjectsPage() {
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
  const [activeTab, setActiveTab]           = useState<PanelTab>("details");

  async function fetchData() {
    try {
      const d = await api.get("/projects/");
      setItems((d as { items: any[] }).items);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError("Project name is required."); return; }
    setSubmitting(true); setCreateError("");
    try {
      await api.post("/projects/", {
        ...form,
        estimated_total: parseFloat(form.estimated_total) || 0,
        estimated_labor_hours: parseFloat(form.estimated_labor_hours) || 0,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      setLoading(true);
      await fetchData();
      toast("Project created");
    } catch (e: any) {
      const msg = e?.message || "Failed to create project.";
      setCreateError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function openPanel(id: string) {
    setPanelOpen(true);
    setActiveTab("details");
    setSelected(null);
    try {
      const d = await api.get(`/projects/${id}`);
      setSelected(d);
      setEditForm({
        name:                  (d as any).name ?? "",
        description:           (d as any).description ?? "",
        project_type:          (d as any).project_type ?? "other",
        status:                (d as any).status ?? "lead",
        risk_level:            (d as any).risk_level ?? "low",
        target_start:          (d as any).target_start ?? "",
        target_completion:     (d as any).target_completion ?? "",
        actual_start:          (d as any).actual_start ?? "",
        actual_completion:     (d as any).actual_completion ?? "",
        install_date:          (d as any).install_date ?? "",
        estimated_total:       String((d as any).estimated_total ?? "0"),
        estimated_labor_hours: String((d as any).estimated_labor_hours ?? "0"),
        address:               (d as any).address ?? "",
        notes:                 (d as any).notes ?? "",
      });
    } catch {
      toast("Failed to load project", "error");
      setPanelOpen(false);
    }
  }

  async function handleSave() {
    if (!editForm.name?.trim()) { toast("Name is required", "error"); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/projects/${selected.id}`, {
        ...editForm,
        estimated_total:       parseFloat(editForm.estimated_total) || 0,
        estimated_labor_hours: parseFloat(editForm.estimated_labor_hours) || 0,
      });
      setPanelOpen(false);
      await fetchData();
      toast("Project saved");
    } catch {
      toast("Failed to save project", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${selected.id}`);
      setPanelOpen(false);
      await fetchData();
      toast("Project deleted");
    } catch {
      toast("Failed to delete project", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading projects…</div></Shell>;

  const counts = {
    active: items.filter(i => !["completed", "cancelled"].includes(i.status)).length,
    atRisk: items.filter(i => ["high", "critical"].includes(i.risk_level)).length,
  };

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Project Tracking</h1>
            <p className="page-subtitle">Full lifecycle from lead to completion</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>+ New Project</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total" value={items.length} />
          <KpiCard label="Active" value={counts.active} />
          <KpiCard label="At Risk" value={counts.atRisk} status={counts.atRisk > 2 ? "bad" : counts.atRisk > 0 ? "warn" : "ok"} />
          <KpiCard label="Completed" value={items.filter(i => i.status === "completed").length} />
        </div>

        {items.length === 0 ? (
          <Card><div className="text-center py-16 text-muted">No projects yet.</div></Card>
        ) : (
          <div className="space-y-1">
            {items.map((p) => (
              <div
                key={p.id}
                className="data-row cursor-pointer hover:bg-surface-elevated rounded px-3 transition-colors"
                onClick={() => openPanel(p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-[11px] text-muted capitalize">{(p.project_type || "").replace(/_/g, " ")}</span>
                  </div>
                  {p.target_completion && (
                    <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Due {p.target_completion}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-mono text-muted">${(p.estimated_total || 0).toLocaleString()}</span>
                  <StatusBadge status={p.status} />
                  {p.risk_level !== "low" && <StatusBadge status={p.risk_level} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Project">
        {createError && <div className="alert-bad mb-4 text-sm">{createError}</div>}
        <FormField label="Project Name" required>
          <FormInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g., Custom Kitchen Cabinetry" />
        </FormField>
        <FormField label="Type">
          <FormSelect value={form.project_type} onChange={(v) => setForm({ ...form, project_type: v })} options={PROJECT_TYPES} />
        </FormField>
        <FormField label="Customer ID (optional)">
          <FormInput value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} placeholder="UUID of existing customer" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Est. Total ($)">
            <FormInput value={form.estimated_total} onChange={(v) => setForm({ ...form, estimated_total: v })} type="number" />
          </FormField>
          <FormField label="Est. Labor Hours">
            <FormInput value={form.estimated_labor_hours} onChange={(v) => setForm({ ...form, estimated_labor_hours: v })} type="number" />
          </FormField>
        </div>
        <FormField label="Target Completion">
          <FormInput value={form.target_completion} onChange={(v) => setForm({ ...form, target_completion: v })} type="date" />
        </FormField>
        <FormField label="Description">
          <FormTextarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        </FormField>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleCreate} disabled={submitting}>{submitting ? "Creating…" : "Create Project"}</Button>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Detail / Edit Slide Panel ─────────────────────── */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={selected?.name ?? "Project Details"}>
        {!selected ? (
          <p className="text-muted text-sm py-4 text-center">Loading…</p>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-5 border-b border-[rgba(94,234,212,0.08)]">
              {(["details", "files"] as PanelTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 pb-2 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "details" && (
              <>
                {/* Quick status row */}
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[rgba(94,234,212,0.08)]">
                  <StatusBadge status={selected.status} />
                  {selected.risk_level !== "low" && <StatusBadge status={selected.risk_level} />}
                  <span className="text-[11px] text-muted ml-auto">${(selected.estimated_total || 0).toLocaleString()} est.</span>
                </div>

                <FormField label="Project Name" required>
                  <FormInput value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Type">
                    <FormSelect value={editForm.project_type} onChange={(v) => setEditForm({ ...editForm, project_type: v })} options={PROJECT_TYPES} />
                  </FormField>
                  <FormField label="Status">
                    <FormSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={PROJECT_STATUSES} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Risk Level">
                    <FormSelect value={editForm.risk_level} onChange={(v) => setEditForm({ ...editForm, risk_level: v })} options={RISK_LEVELS} />
                  </FormField>
                  <FormField label="Target Completion">
                    <FormInput value={editForm.target_completion ?? ""} onChange={(v) => setEditForm({ ...editForm, target_completion: v })} type="date" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Target Start">
                    <FormInput value={editForm.target_start ?? ""} onChange={(v) => setEditForm({ ...editForm, target_start: v })} type="date" />
                  </FormField>
                  <FormField label="Install Date">
                    <FormInput value={editForm.install_date ?? ""} onChange={(v) => setEditForm({ ...editForm, install_date: v })} type="date" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Est. Total ($)">
                    <FormInput value={editForm.estimated_total} onChange={(v) => setEditForm({ ...editForm, estimated_total: v })} type="number" />
                  </FormField>
                  <FormField label="Est. Labor Hours">
                    <FormInput value={editForm.estimated_labor_hours} onChange={(v) => setEditForm({ ...editForm, estimated_labor_hours: v })} type="number" />
                  </FormField>
                </div>
                <FormField label="Address">
                  <FormInput value={editForm.address} onChange={(v) => setEditForm({ ...editForm, address: v })} />
                </FormField>
                <FormField label="Notes">
                  <FormTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} />
                </FormField>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(94,234,212,0.08)]">
                  <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
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

            {activeTab === "files" && selected.customer_id && (
              <FileManager
                customerId={selected.customer_id}
                projectId={selected.id}
                title="Project Files"
              />
            )}
            {activeTab === "files" && !selected.customer_id && (
              <p className="text-muted text-sm text-center py-8">Assign a customer to this project to manage files.</p>
            )}
          </>
        )}
      </SlidePanel>

      <Toaster />
    </Shell>
  );
}
