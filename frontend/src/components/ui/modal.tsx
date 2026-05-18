/** Pegasus Design — InlineIQ Modal + SlidePanel Components */
"use client";
import React, { useEffect } from "react";

interface PanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// ── Centered modal (for create forms) ─────────────────────────────
export function Modal({ open, onClose, title, children }: PanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", handler);
      return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handler); };
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#0a0d10] border border-[rgba(94,234,212,0.22)] rounded-2xl shadow-[0_0_0_1px_rgba(94,234,212,0.08),0_30px_80px_rgba(0,0,0,0.6),0_0_100px_rgba(45,225,201,0.08)] animate-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(94,234,212,0.12)]">
          <h2 className="text-base font-semibold text-[#E6F0EE]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6F6C] hover:text-[#E6F0EE] hover:bg-[rgba(94,234,212,0.06)] transition-colors"
          >✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Right slide panel (for detail / edit views) ────────────────────
export function SlidePanel({ open, onClose, title, children }: PanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px] h-full overflow-y-auto bg-[#0a0d10] border-l border-[rgba(94,234,212,0.22)] shadow-[-20px_0_80px_rgba(0,0,0,0.7)] slide-panel-in">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(94,234,212,0.12)] bg-[#0a0d10] z-10">
          <h2 className="text-base font-semibold text-[#E6F0EE]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6F6C] hover:text-[#E6F0EE] hover:bg-[rgba(94,234,212,0.06)] transition-colors"
          >✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form helpers ───────────────────────────────────────────────────
export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#5F6F6C] mb-2">
        {label}{required && <span className="text-[#F87171] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FormInput({ value, onChange, placeholder, type = "text", required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
      className="w-full px-4 py-3 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] placeholder:text-[#5F6F6C] focus:outline-none focus:border-[rgba(94,234,212,0.3)] focus:ring-1 focus:ring-[rgba(94,234,212,0.1)] transition-all"
    />
  );
}

export function FormSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] focus:outline-none focus:border-[rgba(94,234,212,0.3)] focus:ring-1 focus:ring-[rgba(94,234,212,0.1)] transition-all appearance-none"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FormTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] placeholder:text-[#5F6F6C] focus:outline-none focus:border-[rgba(94,234,212,0.3)] focus:ring-1 focus:ring-[rgba(94,234,212,0.1)] transition-all resize-none"
    />
  );
}
