/** Pegasus Design — Inventory & Purchasing Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, SlidePanel, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { Toaster, toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Package, AlertTriangle, Minus, Plus } from "lucide-react";

const CATEGORIES = [
  { value: "sheet_goods", label: "Sheet Goods" },
  { value: "hardwood",    label: "Hardwood" },
  { value: "hardware",    label: "Hardware" },
  { value: "finishing",   label: "Finishing" },
  { value: "supplies",    label: "Supplies" },
  { value: "other",       label: "Other" },
];

const emptyForm = {
  name: "", category: "supplies", quantity: "0", unit: "ea",
  reorder_point: "0", supplier: "", unit_cost: "0", sku: "", notes: "",
};

export default function InventoryPage() {
  const [items, setItems]           = useState<any[]>([]);
  const [dashData, setDashData]     = useState<any>(null);
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

  // Per-row qty adjustment in progress
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [inv, snap] = await Promise.all([
        api.get("/inventory/"),
        api.get("/dashboard/snapshot"),
      ]);
      setItems((inv as { items: any[] }).items);
      setDashData(snap);
    } catch (e) {
      console.error("[inventory] fetchData:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError("Item name is required."); return; }
    setSubmitting(true); setCreateError("");
    try {
      await api.post("/inventory/", {
        name: form.name, category: form.category,
        quantity_on_hand: parseFloat(form.quantity) || 0,
        unit: form.unit, reorder_point: parseFloat(form.reorder_point) || 0,
        supplier: form.supplier, unit_cost: parseFloat(form.unit_cost) || 0,
        sku: form.sku,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      await fetchData();
      toast("Item added");
    } catch {
      setCreateError("Failed to create item.");
      toast("Failed to create item", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function adjustQty(item: any, delta: number, e: React.MouseEvent) {
    e.stopPropagation();
    const newQty = Math.max(0, (item.quantity_on_hand || 0) + delta);
    setAdjustingId(item.id);
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: newQty } : i));
    try {
      await api.put(`/inventory/${item.id}`, { quantity_on_hand: newQty });
      toast(`${item.name}: qty → ${newQty}`);
      await fetchData();
    } catch {
      toast("Failed to update quantity", "error");
      await fetchData(); // revert
    } finally {
      setAdjustingId(null);
    }
  }

  async function openPanel(id: string) {
    setPanelOpen(true);
    setSelected(null);
    try {
      const d = await api.get(`/inventory/${id}`);
      setSelected(d);
      setEditForm({
        name:             (d as any).name ?? "",
        sku:              (d as any).sku ?? "",
        category:         (d as any).category ?? "supplies",
        quantity_on_hand: String((d as any).quantity_on_hand ?? "0"),
        unit:             (d as any).unit ?? "ea",
        reorder_point:    String((d as any).reorder_point ?? "0"),
        unit_cost:        String((d as any).unit_cost ?? "0"),
        supplier:         (d as any).supplier ?? "",
        notes:            (d as any).notes ?? "",
      });
    } catch {
      toast("Failed to load item", "error");
      setPanelOpen(false);
    }
  }

  async function handleSave() {
    if (!editForm.name?.trim()) { toast("Name is required", "error"); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/inventory/${selected.id}`, {
        ...editForm,
        quantity_on_hand: parseFloat(editForm.quantity_on_hand) || 0,
        reorder_point:    parseFloat(editForm.reorder_point) || 0,
        unit_cost:        parseFloat(editForm.unit_cost) || 0,
      });
      setPanelOpen(false);
      await fetchData();
      toast("Item saved");
    } catch {
      toast("Failed to save item", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${selected.id}`);
      setPanelOpen(false);
      await fetchData();
      toast("Item deleted");
    } catch {
      toast("Failed to delete item", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading inventory…</div></Shell>;

  const lowItems = items.filter(i => i.low_stock_alert);

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Inventory & Purchasing</h1>
            <p className="page-subtitle">Material management and stock intelligence</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>+ Add Item</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Items" value={items.length} />
          <KpiCard label="Low Stock" value={lowItems.length} status={lowItems.length > 2 ? "warn" : "ok"} />
          <KpiCard label="Alerts" value={(dashData?.inventory_alerts as number) || 0} status={((dashData?.inventory_alerts as number) || 0) > 3 ? "warn" : "ok"} />
          <KpiCard label="Open POs" value="—" />
        </div>

        {lowItems.length > 0 && (
          <div className="alert-warn">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>{lowItems.length} items below reorder point</strong>
              <p className="text-[12px] mt-0.5">{lowItems.map((i: any) => i.name).join(", ")}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <Card>
            <div className="text-center py-16 text-muted">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No inventory items yet.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="section-header mb-4">Stock Overview</div>
            <div className="space-y-0">
              {items.map((item: any) => {
                const qty     = item.quantity_on_hand as number;
                const reorder = item.reorder_point as number;
                const itemStatus = item.low_stock_alert ? (qty === 0 ? "bad" : "warn") : "ok";
                const isAdjusting = adjustingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="data-row px-2 cursor-pointer hover:bg-surface-elevated rounded transition-colors group"
                    onClick={() => openPanel(item.id)}
                  >
                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.sku && <span className="text-[10px] text-muted font-mono">{item.sku}</span>}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {item.supplier || "—"} · {(item.category || "").replace(/_/g, " ")} · Reorder at {reorder}
                      </div>
                    </div>

                    {/* Qty controls + status — stop propagation on button clicks so row click doesn't also open panel */}
                    <div className="flex items-center gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-6 h-6 rounded flex items-center justify-center bg-surface-elevated border border-border text-muted hover:text-foreground hover:border-accent/30 transition-all disabled:opacity-30"
                          onClick={(e) => adjustQty(item, -1, e)}
                          disabled={isAdjusting || qty <= 0}
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`text-sm font-mono font-semibold w-8 text-center ${itemStatus === "bad" ? "text-[#F87171]" : itemStatus === "warn" ? "text-[#FBBF24]" : ""}`}>
                          {qty}
                        </span>
                        <button
                          className="w-6 h-6 rounded flex items-center justify-center bg-surface-elevated border border-border text-muted hover:text-foreground hover:border-accent/30 transition-all disabled:opacity-30"
                          onClick={(e) => adjustQty(item, +1, e)}
                          disabled={isAdjusting}
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted">{item.unit}</span>
                      <StatusBadge status={itemStatus === "ok" ? "healthy" : itemStatus === "warn" ? "warning" : "critical"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Inventory Item">
        {createError && <div className="alert-bad mb-4 text-sm">{createError}</div>}
        <FormField label="Item Name" required>
          <FormInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g., 3/4 Walnut Plywood" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="SKU">
            <FormInput value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
          </FormField>
          <FormField label="Category">
            <FormSelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Qty">
            <FormInput value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} type="number" />
          </FormField>
          <FormField label="Unit">
            <FormInput value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="ea" />
          </FormField>
          <FormField label="Reorder Pt">
            <FormInput value={form.reorder_point} onChange={(v) => setForm({ ...form, reorder_point: v })} type="number" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Supplier">
            <FormInput value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} placeholder="e.g., Midwest Hardwood" />
          </FormField>
          <FormField label="Unit Cost ($)">
            <FormInput value={form.unit_cost} onChange={(v) => setForm({ ...form, unit_cost: v })} type="number" />
          </FormField>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleCreate} disabled={submitting}>{submitting ? "Adding…" : "Add Item"}</Button>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Detail / Edit Slide Panel ─────────────────────── */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={selected?.name ?? "Inventory Item"}>
        {!selected ? (
          <p className="text-muted text-sm py-4 text-center">Loading…</p>
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-6 pb-4 border-b border-[rgba(94,234,212,0.08)]">
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">On Hand</div>
                <div className="text-xl font-semibold font-mono">{selected.quantity_on_hand}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Reorder At</div>
                <div className="text-xl font-semibold font-mono">{selected.reorder_point}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Unit Cost</div>
                <div className="text-xl font-semibold font-mono">${selected.unit_cost}</div>
              </div>
            </div>

            <FormField label="Item Name" required>
              <FormInput value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="SKU">
                <FormInput value={editForm.sku} onChange={(v) => setEditForm({ ...editForm, sku: v })} />
              </FormField>
              <FormField label="Category">
                <FormSelect value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} options={CATEGORIES} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Qty On Hand">
                <FormInput value={editForm.quantity_on_hand} onChange={(v) => setEditForm({ ...editForm, quantity_on_hand: v })} type="number" />
              </FormField>
              <FormField label="Unit">
                <FormInput value={editForm.unit} onChange={(v) => setEditForm({ ...editForm, unit: v })} />
              </FormField>
              <FormField label="Reorder Pt">
                <FormInput value={editForm.reorder_point} onChange={(v) => setEditForm({ ...editForm, reorder_point: v })} type="number" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Supplier">
                <FormInput value={editForm.supplier} onChange={(v) => setEditForm({ ...editForm, supplier: v })} />
              </FormField>
              <FormField label="Unit Cost ($)">
                <FormInput value={editForm.unit_cost} onChange={(v) => setEditForm({ ...editForm, unit_cost: v })} type="number" />
              </FormField>
            </div>
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
