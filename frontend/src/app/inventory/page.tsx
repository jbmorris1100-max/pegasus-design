/** Pegasus Design — Inventory & Purchasing Intelligence */
"use client";
import React, { useEffect, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { KpiCard, Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, FormField, FormInput, FormSelect } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { Package, AlertTriangle, ShoppingCart } from "lucide-react";

const CATEGORIES = ["sheet_goods","hardwood","hardware","finishing","supplies","other"];
const ITEMS: Array<{name:string;sku:string;qty:number;reorder:number;supplier:string;status:"ok"|"warn"|"bad"}> = [
  {name:"3/4 Walnut Ply",sku:"HW-PLY-34WN",qty:45,reorder:20,supplier:"Midwest Hardwood",status:"ok"},
  {name:"1/2 Birch Ply",sku:"HW-PLY-12BR",qty:62,reorder:30,supplier:"Columbia Forest",status:"ok"},
  {name:"3/4 White Oak Ply",sku:"HW-PLY-34WO",qty:8,reorder:15,supplier:"Midwest Hardwood",status:"warn"},
  {name:"Blum SC Hinge",sku:"HDW-BLUM",qty:240,reorder:100,supplier:"Richelieu",status:"ok"},
  {name:"Edge Band Walnut",sku:"EDG-WAL",qty:4,reorder:6,supplier:"EdgeCo",status:"bad"},
  {name:"8/4 Walnut BF",sku:"LUM-WAL",qty:320,reorder:150,supplier:"Midwest Hardwood",status:"ok"},
  {name:"WB Conv Varnish",sku:"FIN-WBCV",qty:12,reorder:8,supplier:"ML Campbell",status:"ok"},
];
const lowItems = ITEMS.filter(i=>i.status!=="ok");

export default function InventoryPage() {
  const [data, setData] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", category:"supplies", quantity:"0", unit:"ea", reorder_point:"0", supplier:"", unit_cost:"0", sku:"" });

  useEffect(() => { (async () => { try { setData(await api.get("/dashboard/snapshot")); } catch {} finally { setLoading(false); } })(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Item name is required."); return; }
    setSubmitting(true); setError("");
    try {
      await fetch("/api/v1/inventory/", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ name:form.name, category:form.category, quantity_on_hand:parseFloat(form.quantity)||0,
          unit:form.unit, reorder_point:parseFloat(form.reorder_point)||0, supplier:form.supplier,
          unit_cost:parseFloat(form.unit_cost)||0, sku:form.sku }) });
      setModalOpen(false); setForm({ name:"", category:"supplies", quantity:"0", unit:"ea", reorder_point:"0", supplier:"", unit_cost:"0", sku:"" });
    } catch { setError("Failed to create item."); } finally { setSubmitting(false); }
  }

  if (loading) return <Shell><div className="card text-center py-16 text-muted">Loading inventory…</div></Shell>;

  return (
    <Shell>
      <div className="space-y-5 animate-in">
        <div className="flex items-center justify-between"><div><h1 className="page-title">Inventory & Purchasing</h1><p className="page-subtitle">Material management and stock intelligence</p></div><Button variant="primary" size="sm" onClick={()=>setModalOpen(true)}>+ Add Item</Button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard label="Total Items" value={ITEMS.length}/><KpiCard label="Low Stock" value={lowItems.length} status={lowItems.length>2?"warn":"ok"}/><KpiCard label="Alerts" value={data?.inventory_alerts as number||0} status={(data?.inventory_alerts as number||0)>3?"warn":"ok"}/><KpiCard label="Open POs" value="3"/></div>
        {lowItems.length>0 && <div className="alert-warn"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/><div><strong>{lowItems.length} items below reorder point</strong><p className="text-[12px] mt-0.5">{lowItems.map(i=>i.name).join(", ")}</p></div></div>}
        <Card><div className="section-header mb-4">Stock Overview</div>
          <div className="space-y-0">{ITEMS.map(item=>(
            <div key={item.sku} className="data-row px-2"><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-medium">{item.name}</span><span className="text-[10px] text-muted font-mono">{item.sku}</span></div><div className="text-[11px] text-muted mt-0.5">{item.supplier} · Reorder at {item.reorder}</div></div><div className="flex items-center gap-3"><div className="text-right"><span className={`text-sm font-mono font-semibold ${item.status==="bad"?"text-danger":item.status==="warn"?"text-warning":"text-foreground"}`}>{item.qty}</span><span className="text-[10px] text-muted ml-1">on hand</span></div><StatusBadge status={item.status==="ok"?"healthy":item.status==="warn"?"warning":"critical"}/></div></div>
          ))}</div>
        </Card>
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
