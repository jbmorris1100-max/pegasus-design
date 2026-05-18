/** Pegasus Design — Scheduling & Capacity */
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, SlidePanel, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { Toaster, toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Calendar, Clock, Truck, GripVertical } from "lucide-react";

const BLOCK_TYPES = [
  { value: "production",  label: "Production" },
  { value: "assembly",    label: "Assembly" },
  { value: "finishing",   label: "Finishing" },
  { value: "install",     label: "Install" },
  { value: "maintenance", label: "Maintenance" },
  { value: "training",    label: "Training" },
  { value: "time_off",    label: "Time Off" },
];

const BLOCK_STATUSES = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

const BLOCK_TYPE_COLORS: Record<string, string> = {
  production:  "text-[#5EEAD4] border-[rgba(94,234,212,0.2)] bg-[rgba(94,234,212,0.04)]",
  assembly:    "text-[#A78BFA] border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.04)]",
  finishing:   "text-[#FBBF24] border-[rgba(251,191,36,0.2)]  bg-[rgba(251,191,36,0.04)]",
  install:     "text-[#34D399] border-[rgba(52,211,153,0.2)]  bg-[rgba(52,211,153,0.04)]",
  maintenance: "text-[#F87171] border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.04)]",
  training:    "text-[#60A5FA] border-[rgba(96,165,250,0.2)]  bg-[rgba(96,165,250,0.04)]",
  time_off:    "text-[#9AAAA7] border-[rgba(154,170,167,0.2)] bg-[rgba(154,170,167,0.04)]",
};

const emptyForm = {
  title: "", block_type: "production", start_date: "", end_date: "",
  department: "", assigned_to: "", estimated_hours: "0", notes: "",
};

function toDateStr(d: Date): string {
  // Format as YYYY-MM-DD in local time (avoid UTC offset shifting the date)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SchedulingPage() {
  const [blocks, setBlocks]         = useState<any[]>([]);
  const [snapData, setSnapData]     = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm]             = useState(emptyForm);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null); // date string

  // Edit slide panel
  const [panelOpen, setPanelOpen]           = useState(false);
  const [selected, setSelected]             = useState<any>(null);
  const [editForm, setEditForm]             = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  // Rolling 7-day week starting today
  const weekDays = useMemo<Date[]>(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  async function fetchBlocks() {
    try {
      const d = await api.get("/schedule-blocks/");
      setBlocks((d as { items: any[] }).items);
    } catch (e) {
      console.error("[scheduling] fetchBlocks:", e);
    }
  }

  async function fetchSnapshot() {
    try {
      setSnapData(await api.get("/dashboard/snapshot"));
    } catch {}
  }

  useEffect(() => {
    Promise.all([fetchBlocks(), fetchSnapshot()]).finally(() => setLoading(false));
  }, []);

  function blocksForDay(day: Date): any[] {
    const ds = toDateStr(day);
    return blocks.filter(b => b.start_date === ds);
  }

  // ── Drag handlers ────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, blockId: string) {
    setDraggingId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(dateStr);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the column entirely (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOver(null);
  }

  async function handleDrop(e: React.DragEvent, targetDay: Date) {
    e.preventDefault();
    setDragOver(null);
    const blockId = e.dataTransfer.getData("text/plain") || draggingId;
    if (!blockId) return;

    const block = blocks.find(b => b.id === blockId);
    if (!block) { setDraggingId(null); return; }

    const newStart = toDateStr(targetDay);
    if (block.start_date === newStart) { setDraggingId(null); return; }

    // Preserve block duration
    const durationDays = block.start_date && block.end_date
      ? Math.max(0, Math.round(
          (new Date(block.end_date + "T00:00:00").getTime() -
           new Date(block.start_date + "T00:00:00").getTime()) / 86400000
        ))
      : 0;
    const newEndDate = new Date(targetDay);
    newEndDate.setDate(newEndDate.getDate() + durationDays);
    const newEnd = toDateStr(newEndDate);

    // Optimistic update
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, start_date: newStart, end_date: newEnd } : b
    ));
    setDraggingId(null);

    try {
      await api.put(`/schedule-blocks/${blockId}`, { start_date: newStart, end_date: newEnd });
      toast("Block moved");
    } catch {
      toast("Failed to move block", "error");
      await fetchBlocks(); // revert
    }
  }

  // ── Create ───────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.title.trim()) { setCreateError("Title is required."); return; }
    setSubmitting(true); setCreateError("");
    try {
      await api.post("/schedule-blocks/", {
        ...form, estimated_hours: parseFloat(form.estimated_hours) || 0,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      await fetchBlocks();
      toast("Block created");
    } catch {
      setCreateError("Failed to create block.");
      toast("Failed to create block", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Open edit panel ──────────────────────────────────────────────
  function openPanel(block: any) {
    setSelected(block);
    setEditForm({
      title:           block.title ?? "",
      block_type:      block.block_type ?? "production",
      start_date:      block.start_date ?? "",
      end_date:        block.end_date ?? "",
      department:      block.department ?? "",
      assigned_to:     block.assigned_to ?? "",
      estimated_hours: String(block.estimated_hours ?? "0"),
      status:          block.status ?? "scheduled",
      notes:           block.notes ?? "",
    });
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!editForm.title?.trim()) { toast("Title is required", "error"); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/schedule-blocks/${selected.id}`, {
        ...editForm, estimated_hours: parseFloat(editForm.estimated_hours) || 0,
      });
      setPanelOpen(false);
      await fetchBlocks();
      toast("Block saved");
    } catch {
      toast("Failed to save block", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/schedule-blocks/${selected.id}`);
      setPanelOpen(false);
      await fetchBlocks();
      toast("Block deleted");
    } catch {
      toast("Failed to delete block", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading schedule…</div></Shell>;

  const totalBlocksThisWeek = weekDays.reduce((sum, d) => sum + blocksForDay(d).length, 0);

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Scheduling & Capacity</h1>
            <p className="page-subtitle">Production calendar and resource allocation</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>+ Add Block</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Active Projects" value={(snapData?.active_projects as number) || 0} />
          <KpiCard label="This Week Installs" value={(snapData?.scheduled_installs as number) || 0} />
          <KpiCard
            label="Labor Util"
            value={Math.round(((snapData?.labor_utilization as number) || 0) * 100) + "%"}
            status={(snapData?.labor_utilization as number || 0) > 0.85 ? "bad" : (snapData?.labor_utilization as number || 0) > 0.7 ? "warn" : "ok"}
          />
          <KpiCard label="Blocks This Week" value={totalBlocksThisWeek} />
        </div>

        {/* ── Weekly Drag-Drop Calendar ───────────────────────── */}
        <Card>
          <div className="section-header mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>This Week</span>
            <span className="text-[10px] text-muted ml-2">drag blocks to reschedule · click to edit</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day, i) => {
              const dateStr = toDateStr(day);
              const isToday = i === 0;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const dayBlocks = blocksForDay(day);
              const isDragTarget = dragOver === dateStr;

              return (
                <div
                  key={dateStr}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                  className={[
                    "min-h-[120px] p-2 rounded-xl border transition-all duration-150",
                    isDragTarget ? "drop-zone-active" : "",
                    isToday
                      ? "border-[rgba(94,234,212,0.3)] bg-[rgba(94,234,212,0.03)]"
                      : isWeekend
                      ? "border-border bg-[rgba(255,255,255,0.01)] opacity-60"
                      : "border-border bg-[rgba(255,255,255,0.01)]",
                  ].join(" ")}
                >
                  {/* Day header */}
                  <div className="text-center mb-2">
                    <div className="text-[9px] text-muted uppercase tracking-wider">
                      {day.toLocaleDateString("en", { weekday: "short" })}
                    </div>
                    <div className={`text-sm font-semibold mt-0.5 ${isToday ? "text-accent" : ""}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Blocks */}
                  <div className="space-y-1">
                    {dayBlocks.map(block => {
                      const colorCls = BLOCK_TYPE_COLORS[block.block_type] || BLOCK_TYPE_COLORS.production;
                      const isDragging = draggingId === block.id;
                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openPanel(block)}
                          className={[
                            "p-1.5 rounded-lg border cursor-grab active:cursor-grabbing",
                            "hover:shadow-[0_0_0_1px_rgba(94,234,212,0.2)] transition-all select-none",
                            colorCls,
                            isDragging ? "opacity-40" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <GripVertical className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
                            <span className="text-[9px] font-bold uppercase tracking-wider truncate">
                              {(block.block_type || "").replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium truncate leading-tight">{block.title}</div>
                          {block.assigned_to && (
                            <div className="text-[10px] opacity-60 truncate mt-0.5">{block.assigned_to}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Scheduled Installs ──────────────────────────────── */}
        <Card>
          <div className="section-header mb-3 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" />
            <span>Scheduled Installs</span>
          </div>
          {((snapData?.installs_this_week as unknown[])?.length || 0) === 0 ? (
            <div className="text-center py-8 text-muted text-sm">No installs scheduled this week.</div>
          ) : (
            <div className="space-y-1">
              {(snapData?.installs_this_week as any[])?.map((inst: any) => (
                <div key={inst.id} className="data-row rounded px-2">
                  <div>
                    <span className="text-sm font-medium">{inst.project_name}</span>
                    <div className="text-[11px] text-muted">{inst.scheduled_date} — {inst.lead_installer || "Unassigned"}</div>
                  </div>
                  <StatusBadge status={inst.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Schedule Block">
        {createError && <div className="alert-bad mb-4 text-sm">{createError}</div>}
        <FormField label="Title" required>
          <FormInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g., Production Block 16" />
        </FormField>
        <FormField label="Block Type">
          <FormSelect value={form.block_type} onChange={(v) => setForm({ ...form, block_type: v })} options={BLOCK_TYPES} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date">
            <FormInput value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} type="date" />
          </FormField>
          <FormField label="End Date">
            <FormInput value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} type="date" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Department">
            <FormInput value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="e.g., Production" />
          </FormField>
          <FormField label="Assigned To">
            <FormInput value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v })} placeholder="Name or email" />
          </FormField>
        </div>
        <FormField label="Estimated Hours">
          <FormInput value={form.estimated_hours} onChange={(v) => setForm({ ...form, estimated_hours: v })} type="number" />
        </FormField>
        <FormField label="Notes">
          <FormTextarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        </FormField>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleCreate} disabled={submitting}>{submitting ? "Adding…" : "Add Block"}</Button>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Edit Slide Panel ──────────────────────────────── */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={selected?.title ?? "Schedule Block"}>
        {selected && (
          <>
            {/* Block type badge */}
            <div className="mb-6 pb-4 border-b border-[rgba(94,234,212,0.08)]">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${BLOCK_TYPE_COLORS[selected.block_type] || BLOCK_TYPE_COLORS.production}`}>
                {(selected.block_type || "").replace(/_/g, " ")}
              </div>
              <div className="text-[11px] text-muted mt-2">
                {selected.start_date} → {selected.end_date || selected.start_date}
                {selected.assigned_to ? ` · ${selected.assigned_to}` : ""}
              </div>
            </div>

            <FormField label="Title" required>
              <FormInput value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Block Type">
                <FormSelect value={editForm.block_type} onChange={(v) => setEditForm({ ...editForm, block_type: v })} options={BLOCK_TYPES} />
              </FormField>
              <FormField label="Status">
                <FormSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={BLOCK_STATUSES} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date">
                <FormInput value={editForm.start_date} onChange={(v) => setEditForm({ ...editForm, start_date: v })} type="date" />
              </FormField>
              <FormField label="End Date">
                <FormInput value={editForm.end_date} onChange={(v) => setEditForm({ ...editForm, end_date: v })} type="date" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Department">
                <FormInput value={editForm.department} onChange={(v) => setEditForm({ ...editForm, department: v })} />
              </FormField>
              <FormField label="Assigned To">
                <FormInput value={editForm.assigned_to} onChange={(v) => setEditForm({ ...editForm, assigned_to: v })} />
              </FormField>
            </div>
            <FormField label="Estimated Hours">
              <FormInput value={editForm.estimated_hours} onChange={(v) => setEditForm({ ...editForm, estimated_hours: v })} type="number" />
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
      </SlidePanel>

      <Toaster />
    </Shell>
  );
}
