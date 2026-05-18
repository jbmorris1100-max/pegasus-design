/** Pegasus Design — CRM: Customer Intelligence */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/ui/shell";
import { Card, StatusBadge, Button } from "@/components/ui/core";
import { Modal, SlidePanel, FormField, FormInput, FormSelect, FormTextarea } from "@/components/ui/modal";
import { Toaster, toast } from "@/components/ui/toast";
import { FileManager } from "@/components/FileManager";
import { api } from "@/lib/api";
import { Users, Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";

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

type PanelTab = "details" | "files" | "messages";

export default function CrmPage() {
  const [items,           setItems]           = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [createOpen,      setCreateOpen]      = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [createError,     setCreateError]     = useState("");
  const [form,            setForm]            = useState(emptyForm);

  // Detail / edit slide panel
  const [panelOpen,       setPanelOpen]       = useState(false);
  const [selected,        setSelected]        = useState<any>(null);
  const [editForm,        setEditForm]        = useState<any>({});
  const [editSubmitting,  setEditSubmitting]  = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [activeTab,       setActiveTab]       = useState<PanelTab>("details");

  // Messages
  const [messages,        setMessages]        = useState<any[]>([]);
  const [msgLoading,      setMsgLoading]      = useState(false);
  const [msgText,         setMsgText]         = useState("");
  const [sending,         setSending]         = useState(false);
  const [unreadMap,       setUnreadMap]       = useState<Record<string, number>>({});
  const msgEndRef = useRef<HTMLDivElement>(null);

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

  async function fetchUnread() {
    try {
      const d = await api.get("/portal/messages/unread-counts");
      setUnreadMap(d as Record<string, number>);
    } catch { /* non-fatal */ }
  }

  useEffect(() => { fetchData(); fetchUnread(); }, []);

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
    setActiveTab("details");
    setMessages([]);
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
        access_code:   (d as any).access_code ?? "",
      });
    } catch {
      toast("Failed to load customer", "error");
      setPanelOpen(false);
    }
  }

  async function loadMessages(customerId: string) {
    setMsgLoading(true);
    try {
      const d = await api.get(`/portal/messages/${customerId}`);
      setMessages((d as any).items ?? []);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { /* ignore */ } finally {
      setMsgLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "messages" && selected) {
      loadMessages(selected.id);
    }
  }, [activeTab, selected]);

  async function sendMessage() {
    if (!msgText.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/portal/messages/${selected.id}`, { message: msgText.trim(), sender: "company" });
      setMsgText("");
      await loadMessages(selected.id);
      await fetchUnread();
    } catch {
      toast("Failed to send message", "error");
    } finally {
      setSending(false);
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
            {items.map((c) => {
              const unread = unreadMap[c.id] ?? 0;
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:border-accent/30 transition-colors"
                  onClick={() => openPanel(c.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{c.name}</h3>
                    <div className="flex items-center gap-1.5">
                      {unread > 0 && (
                        <span className="flex items-center gap-0.5 bg-[#F87171] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          <MessageCircle className="w-2.5 h-2.5" />{unread}
                        </span>
                      )}
                      <StatusBadge status={c.status} />
                    </div>
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
              );
            })}
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
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[rgba(94,234,212,0.08)]">
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

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-[rgba(94,234,212,0.08)] pb-0">
              {(["details", "files", "messages"] as PanelTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-all -mb-px ${
                    activeTab === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ── Details tab ── */}
            {activeTab === "details" && (
              <>
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
                <FormField label="Portal Access Code">
                  <FormInput
                    value={editForm.access_code}
                    onChange={(v) => setEditForm({ ...editForm, access_code: v.slice(0, 6) })}
                    placeholder="6-digit code for client portal"
                  />
                </FormField>
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

            {/* ── Files tab ── */}
            {activeTab === "files" && (
              <FileManager customerId={selected.id} title="Customer Files" />
            )}

            {/* ── Messages tab ── */}
            {activeTab === "messages" && (
              <div className="flex flex-col" style={{ minHeight: 340 }}>
                {msgLoading ? (
                  <p className="text-muted text-xs text-center py-6">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-muted text-xs text-center py-6">No messages yet. Start the conversation.</p>
                ) : (
                  <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[320px] pr-1">
                    {messages.map(m => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === "company" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          m.sender === "company"
                            ? "bg-[rgba(94,234,212,0.12)] text-foreground rounded-br-sm"
                            : "bg-surface-elevated border border-border text-foreground rounded-bl-sm"
                        }`}>
                          <p className="leading-relaxed">{m.message}</p>
                          <p className="text-[9px] text-muted mt-1 text-right">
                            {m.sender === "company" ? "You" : "Client"} ·{" "}
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={msgEndRef} />
                  </div>
                )}

                {/* Send box */}
                <div className="flex gap-2 mt-auto pt-3 border-t border-[rgba(94,234,212,0.08)]">
                  <input
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-foreground placeholder:text-muted focus:outline-none focus:border-[rgba(94,234,212,0.3)]"
                  />
                  <Button variant="primary" size="sm" onClick={sendMessage} disabled={sending || !msgText.trim()}>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SlidePanel>

      <Toaster />
    </Shell>
  );
}
