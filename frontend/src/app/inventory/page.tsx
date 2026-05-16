/** Pegasus Design — Inventory & Purchasing Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Package, AlertTriangle, ShoppingCart } from "lucide-react";

const CATEGORIES = ["sheet_goods","hardwood","hardware","finishing","supplies","other"];

export default function InventoryPage() {
  const [items, setItems] = useState<Array<Record<string,unknown>>>([]);
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", category:"supplies", quantity:"0", unit:"ea", reorder_point:"0", supplier:"", unit_cost:"0", sku:"" });

  async function fetchData() {
    try {
      const [inv, snap] = await Promise.all([
        api.get("/inventory/"),
        api.get("/dashboard/snapshot"),
      ]);
      setItems((inv as {items:[]}).items);
      setData(snap as Record<string,unknown>);
    } catch (e) { console.error("[inventory] fetchData:", e); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Item name is required."); return; }
    setSubmitting(true); setError("");
    try {
      await api.post("/inventory/", { name:form.name, category:form.category, quantity_on_hand:parseFloat(form.quantity)||0,
          unit:form.unit, reorder_point:parseFloat(form.reorder_point)||0, supplier:form.supplier,
          unit_cost:parseFloat(form.unit_cost)||0, sku:form.sku });
      setModalOpen(false); setForm({ name:"", category:"supplies", quantity:"0", unit:"ea", reorder_point:"0", supplier:"", unit_cost:"0", sku:"" });
      await fetchData();
    } catch { setError("Failed to create item."); } finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading inventory…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Inventory & Purchasing</h1><p className="page-subtitle">Material management and stock intelligence</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ Add Item</Button></div>
        {(() => {
          const lowItems = items.filter(i=>i.low_stock_alert);
          return (<>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Total Items" value={items.length}/><KpiCard label="Low Stock" value={lowItems.length} status={lowItems.length>2?"warn":"ok"}/><KpiCard label="Alerts" value={data?.inventory_alerts as number||0} status={(data?.inventory_alerts as number||0)>3?"warn":"ok"}/><KpiCard label="Open POs" value="—"/></div>
            {lowItems.length>0 && <div className="alert-warn"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/><div><strong>{lowItems.length} items below reorder point</strong><p className="text-[12px] mt-0.5">{lowItems.map((i:any)=>i.name).join(", ")}</p></div></div>}
            {items.length===0 ? <Card><div className="text-center py-16 text-muted"><Package className="w-10 h-10 mx-auto mb-3 opacity-20"/><p>No inventory items yet.</p></div></Card> : (
              <Card><div className="section-header mb-4">Stock Overview</div>
                <div className="space-y-0">{items.map((item:any)=>{
                  const qty = item.quantity_on_hand as number;
                  const reorder = item.reorder_point as number;
                  const itemStatus = item.low_stock_alert ? (qty===0?"bad":"warn") : "ok";
                  return (<div key={item.id as string} className="data-row px-2"><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-medium">{item.name as string}</span>{item.sku&&<span className="text-[10px] text-muted font-mono">{item.sku as string}</span>}</div><div className="text-[11px] text-muted mt-0.5">{item.supplier as string||"—"} · Reorder at {reorder}</div></div><div className="flex items-center gap-3"><div className="text-right"><span className={`text-sm font-mono font-semibold ${itemStatus==="bad"?"text-danger":itemStatus==="warn"?"text-warning":"text-foreground"}`}>{qty}</span><span className="text-[10px] text-muted ml-1">on hand</span></div><StatusBadge status={itemStatus==="ok"?"healthy":itemStatus==="warn"?"warning":"critical"}/></div></div>);
                })}</div>
              </Card>
            )}
          </>);
        })()}
      </div>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Add Inventory Item">
        {error && <div className="alert-bad mb-4 text-sm">{error}</div>}
        <FormField label="Item Name" required><FormInput value={form.name} onChange={(v)=>setForm({...form,name:v})} placeholder="e.g., 3/4 Walnut Plywood"/></FormField>
        <div className="grid grid-cols-2 gap-3"><FormField label="SKU"><FormInput value={form.sku} onChange={(v)=>setForm({...form,sku:v})}/></FormField><FormField label="Category"><FormSelect value={form.category} onChange={(v)=>setForm({...form,category:v})} options={CATEGORIES.map(c=>({value:c,label:c.replace(/_/g," ")}))}/></FormField></div>
        <div className="grid grid-cols-3 gap-3"><FormField label="Qty"><FormInput value={form.quantity} onChange={(v)=>setForm({...form,quantity:v})} type="number"/></FormField><FormField label="Unit"><FormInput value={form.unit} onChange={(v)=>setForm({...form,unit:v})} placeholder="ea"/></FormField><FormField label="Reorder Pt"><FormInput value={form.reorder_point} onChange={(v)=>setForm({...form,reorder_point:v})} type="number"/></FormField></div>
        <div className="grid grid-cols-2 gap-3"><FormField label="Supplier"><FormInput value={form.supplier} onChange={(v)=>setForm({...form,supplier:v})} placeholder="e.g., Midwest Hardwood"/></FormField><FormField label="Unit Cost ($)"><FormInput value={form.unit_cost} onChange={(v)=>setForm({...form,unit_cost:v})} type="number"/></FormField></div>
        <div className="flex items-center gap-3 pt-2"><Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting?"Adding…":"Add Item"}</Button><Button variant="ghost" size="sm" onClick={()=>setModalOpen(false)}>Cancel</Button></div>
      </Modal>
    </Shell>
  );
}
