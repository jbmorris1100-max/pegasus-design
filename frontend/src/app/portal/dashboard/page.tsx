/** Pegasus Design — Client Portal Dashboard */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PortalTab = "progress" | "files" | "messages";

const STATUS_PHASES = [
  { key: "lead",              label: "Lead" },
  { key: "estimating",        label: "Estimating" },
  { key: "estimate_sent",     label: "Est. Sent" },
  { key: "approved",          label: "Approved" },
  { key: "in_production",     label: "Production" },
  { key: "finishing",         label: "Finishing" },
  { key: "ready_for_install", label: "Ready" },
  { key: "installing",        label: "Install" },
  { key: "completed",         label: "Complete" },
];

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF", png: "Image", jpg: "Image", jpeg: "Image",
  dwg: "CAD", dxf: "CAD", docx: "Document", xlsx: "Spreadsheet",
};

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api/v1`;
  return "";
}

function getUploadsBase(): string {
  return getApiBase().replace(/\/api\/v1$/, "");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function phaseIndex(status: string): number {
  const idx = STATUS_PHASES.findIndex(p => p.key === status);
  return idx === -1 ? 0 : idx;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data,       setData]       = useState<any>(null);
  const [messages,   setMessages]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgText,    setMsgText]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<PortalTab>("progress");
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token      = localStorage.getItem("portal_token");
    const customerId = localStorage.getItem("portal_customer_id");
    if (!token || !customerId) { router.replace("/portal/login"); return; }
    fetchDashboard(customerId, token);
  }, []);

  useEffect(() => {
    if (activeTab === "messages" && data) {
      loadMessages();
    }
  }, [activeTab, data]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchDashboard(customerId: string, token: string) {
    try {
      const res = await fetch(`${getApiBase()}/portal/dashboard/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace("/portal/login"); return; }
      const d = await res.json();
      setData(d);
    } catch {
      // leave loading state — will show error
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    const token      = localStorage.getItem("portal_token");
    const customerId = localStorage.getItem("portal_customer_id");
    if (!token || !customerId) return;
    setMsgLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/portal/messages/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setMessages(d.messages ?? []);
    } catch {}
    finally { setMsgLoading(false); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgText.trim() || sending) return;
    const token      = localStorage.getItem("portal_token");
    const customerId = localStorage.getItem("portal_customer_id");
    if (!token || !customerId) return;
    setSending(true);
    try {
      await fetch(`${getApiBase()}/portal/messages/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msgText.trim(), sender: "client" }),
      });
      setMsgText("");
      await loadMessages();
    } catch {}
    finally { setSending(false); }
  }

  function handleSignOut() {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_customer_id");
    router.push("/portal/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020405] flex items-center justify-center">
        <div className="text-[#5F6F6C] text-sm">Loading your portal…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020405] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#F87171] text-sm mb-4">Could not load your portal. Please try signing in again.</p>
          <button onClick={() => router.push("/portal/login")} className="px-4 py-2 rounded-lg bg-[#5EEAD4] text-[#001917] text-sm font-semibold">Back to Login</button>
        </div>
      </div>
    );
  }

  const { customer, projects = [], files = [] } = data;

  return (
    <div className="min-h-screen bg-[#020405] text-[#E6F0EE]">
      {/* Header */}
      <header className="border-b border-[rgba(94,234,212,0.08)] px-4 py-3 flex items-center justify-between sticky top-0 bg-[#020405] z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#5EEAD4] flex items-center justify-center">
            <span className="text-[#001917] font-bold text-[11px]">P</span>
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">{customer.name}</div>
            <div className="text-[10px] text-[#5F6F6C]">Client Portal</div>
          </div>
        </div>
        <button onClick={handleSignOut} className="text-[11px] text-[#5F6F6C] hover:text-[#E6F0EE] transition-colors px-3 py-1.5 rounded-lg hover:bg-[rgba(94,234,212,0.06)]">
          Sign Out
        </button>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-[rgba(94,234,212,0.08)] px-4">
        {(["progress", "files", "messages"] as PortalTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#5EEAD4] text-[#5EEAD4]"
                : "border-transparent text-[#5F6F6C] hover:text-[#E6F0EE]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Progress Tab ───────────────────────────────── */}
        {activeTab === "progress" && (
          <div className="space-y-4">
            <p className="text-[12px] text-[#5F6F6C]">Your active projects and current phase.</p>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-[#5F6F6C] text-sm">No projects found.</div>
            ) : (
              projects.map((p: any) => {
                const phase = phaseIndex(p.status);
                const pct   = Math.round(((phase + 1) / STATUS_PHASES.length) * 100);
                return (
                  <div key={p.id} className="bg-[#070a0d] border border-[rgba(94,234,212,0.1)] rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-sm font-semibold">{p.name}</div>
                        {p.target_completion && (
                          <div className="text-[11px] text-[#5F6F6C] mt-0.5">Est. completion: {fmtDate(p.target_completion)}</div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(94,234,212,0.1)] text-[#5EEAD4] border border-[rgba(94,234,212,0.2)] whitespace-nowrap">
                        {STATUS_PHASES[phase]?.label ?? p.status}
                      </span>
                    </div>

                    {/* Phase progress bar */}
                    <div className="relative">
                      <div className="h-1.5 rounded-full bg-[rgba(94,234,212,0.08)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#5EEAD4] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 overflow-hidden">
                        {STATUS_PHASES.map((ph, i) => (
                          <div
                            key={ph.key}
                            className={`text-[8px] font-medium transition-colors ${
                              i <= phase ? "text-[#5EEAD4]" : "text-[#3a4a48]"
                            }`}
                            style={{ width: `${100 / STATUS_PHASES.length}%`, textAlign: "center" }}
                          >
                            {ph.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {p.estimated_total > 0 && (
                      <div className="mt-4 pt-3 border-t border-[rgba(94,234,212,0.06)] flex items-center justify-between">
                        <span className="text-[11px] text-[#5F6F6C]">Project Value</span>
                        <span className="text-[13px] font-mono font-semibold">${(p.estimated_total || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Files Tab ──────────────────────────────────── */}
        {activeTab === "files" && (
          <div className="space-y-3">
            <p className="text-[12px] text-[#5F6F6C]">Documents and files shared with you.</p>
            {files.length === 0 ? (
              <div className="text-center py-12 text-[#5F6F6C] text-sm">No files have been shared yet.</div>
            ) : (
              files.map((f: any) => (
                <a
                  key={f.id}
                  href={`${getUploadsBase()}${f.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  download={f.filename}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(94,234,212,0.1)] bg-[#070a0d] hover:border-[rgba(94,234,212,0.25)] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(94,234,212,0.08)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-[#5EEAD4] uppercase">{FILE_TYPE_LABELS[f.file_type] ?? f.file_type ?? "—"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-[#5EEAD4] transition-colors">{f.display_name || f.filename}</div>
                    <div className="text-[10px] text-[#5F6F6C] mt-0.5">{fmtSize(f.file_size)} · {fmtDate(f.created_at)}</div>
                  </div>
                  <div className="text-[#5F6F6C] group-hover:text-[#5EEAD4] transition-colors text-[11px]">↓</div>
                </a>
              ))
            )}
          </div>
        )}

        {/* ── Messages Tab ───────────────────────────────── */}
        {activeTab === "messages" && (
          <div className="flex flex-col" style={{ minHeight: "60vh" }}>
            <p className="text-[12px] text-[#5F6F6C] mb-4">Send messages to your project team.</p>

            {/* Message thread */}
            <div className="flex-1 space-y-3 mb-4">
              {msgLoading ? (
                <div className="text-center py-8 text-[#5F6F6C] text-sm">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-[#5F6F6C] text-sm">No messages yet. Send one below!</div>
              ) : (
                messages.map((m: any) => {
                  const isClient = m.sender === "client";
                  return (
                    <div key={m.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isClient
                            ? "bg-[#5EEAD4] text-[#001917] rounded-br-sm"
                            : "bg-[#0f1518] border border-[rgba(94,234,212,0.1)] text-[#E6F0EE] rounded-bl-sm"
                        }`}
                      >
                        {m.message}
                        <div className={`text-[9px] mt-1 ${isClient ? "text-[rgba(0,25,23,0.6)]" : "text-[#5F6F6C]"}`}>
                          {fmtDate(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Send box */}
            <form onSubmit={sendMessage} className="flex gap-2 sticky bottom-0 pb-2">
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Type a message…"
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-[#070a0d] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] placeholder:text-[#3a4a48] focus:outline-none focus:border-[rgba(94,234,212,0.35)] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || !msgText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#5EEAD4] text-[#001917] text-sm font-semibold disabled:opacity-40 transition-opacity hover:bg-[#4DD4BE]"
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
