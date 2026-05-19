/** Pegasus Design — Pending File Uploader (attach files during record creation) */
"use client";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Upload, X, FileText, Image, File as FileIcon } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_EXTS = new Set(["pdf", "png", "jpg", "jpeg", "dwg", "dxf", "docx", "xlsx"]);
const MAX_BYTES = 50 * 1024 * 1024;

const UPLOAD_CATEGORIES = [
  { value: "plan",     label: "Plan" },
  { value: "contract", label: "Contract" },
  { value: "photo",    label: "Photo" },
  { value: "spec",     label: "Spec" },
  { value: "other",    label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  plan:     "text-[#60A5FA] bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.2)]",
  contract: "text-[#A78BFA] bg-[rgba(167,139,250,0.1)] border-[rgba(167,139,250,0.2)]",
  photo:    "text-[#34D399] bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.2)]",
  spec:     "text-[#FBBF24] bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.2)]",
  other:    "text-[#5F6F6C] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]",
};

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:  <FileText className="w-3.5 h-3.5 text-[#F87171]" />,
  png:  <Image    className="w-3.5 h-3.5 text-[#60A5FA]" />,
  jpg:  <Image    className="w-3.5 h-3.5 text-[#60A5FA]" />,
  jpeg: <Image    className="w-3.5 h-3.5 text-[#60A5FA]" />,
  dwg:  <FileIcon className="w-3.5 h-3.5 text-[#FBBF24]" />,
  dxf:  <FileIcon className="w-3.5 h-3.5 text-[#FBBF24]" />,
  docx: <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />,
  xlsx: <FileText className="w-3.5 h-3.5 text-[#34D399]" />,
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api/v1`;
  return "";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingFile {
  id: string;
  file: File;
  category: string;
  status: "pending" | "uploading" | "done" | "error";
}

export interface PendingFileUploaderHandle {
  /**
   * Upload all pending files to the given entity.
   * - entityType "customer":  entityId IS the customer_id; no customerId arg needed
   * - entityType "project":   entityId = project ID, customerId = owner customer ID
   * - entityType "estimate":  entityId = estimate ID, customerId = owner customer ID
   */
  uploadAll: (
    entityId: string,
    entityType: "customer" | "project" | "estimate",
    customerId?: string,
  ) => Promise<{ success: number; failed: number }>;
  hasPending: () => boolean;
}

interface Props {
  label?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PendingFileUploader = forwardRef<PendingFileUploaderHandle, Props>(
  function PendingFileUploader({ label = "Attach Files (optional)" }, ref) {
    const [pending,     setPending]     = useState<PendingFile[]>([]);
    const [dragOver,    setDragOver]    = useState(false);
    const [defaultCat,  setDefaultCat]  = useState("other");
    const [isUploading, setIsUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        hasPending: () => pending.length > 0,

        uploadAll: async (entityId, entityType, customerId) => {
          if (pending.length === 0) return { success: 0, failed: 0 };
          setIsUploading(true);
          const apiBase = getApiBase();
          let success = 0;
          let failed  = 0;

          for (const pf of pending) {
            setPending(prev => prev.map(p => p.id === pf.id ? { ...p, status: "uploading" } : p));

            const fd = new FormData();
            fd.append("file",        pf.file);
            fd.append("category",    pf.category);
            fd.append("uploaded_by", "staff");

            if (entityType === "customer") {
              fd.append("customer_id", entityId);
            } else if (entityType === "project") {
              fd.append("customer_id", customerId ?? entityId);
              fd.append("project_id",  entityId);
            } else {
              fd.append("customer_id", customerId ?? entityId);
              fd.append("estimate_id", entityId);
            }

            try {
              const res = await fetch(`${apiBase}/files/upload`, { method: "POST", body: fd });
              if (res.ok) {
                success++;
                setPending(prev => prev.map(p => p.id === pf.id ? { ...p, status: "done" } : p));
              } else {
                failed++;
                setPending(prev => prev.map(p => p.id === pf.id ? { ...p, status: "error" } : p));
              }
            } catch {
              failed++;
              setPending(prev => prev.map(p => p.id === pf.id ? { ...p, status: "error" } : p));
            }
          }

          setIsUploading(false);
          return { success, failed };
        },
      }),
      [pending],
    );

    function addFiles(fileList: FileList | null) {
      if (!fileList?.length) return;
      const next: PendingFile[] = [];
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXTS.has(ext) || file.size > MAX_BYTES) continue;
        next.push({ id: `${Date.now()}-${Math.random()}`, file, category: defaultCat, status: "pending" });
      }
      setPending(prev => [...prev, ...next]);
      if (fileInput.current) fileInput.current.value = "";
    }

    const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
    };
    const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

    return (
      <div className="mt-1">
        {/* Section label */}
        <div className="mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5F6F6C]">{label}</span>
        </div>

        {/* Pending file list */}
        {pending.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {pending.map(pf => {
              const ext       = pf.file.name.split(".").pop()?.toLowerCase() ?? "";
              const isPending = pf.status === "pending";
              return (
                <div
                  key={pf.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                    pf.status === "done"       ? "border-[rgba(52,211,153,0.3)]  bg-[rgba(52,211,153,0.04)]"
                    : pf.status === "error"    ? "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.04)]"
                    : pf.status === "uploading"? "border-[rgba(94,234,212,0.2)]  bg-[rgba(94,234,212,0.03)]"
                    : "border-[rgba(94,234,212,0.12)] bg-[#050608]"
                  }`}
                >
                  {/* File type icon */}
                  <div className="flex-shrink-0">
                    {FILE_ICONS[ext] ?? <FileIcon className="w-3.5 h-3.5 text-[#5F6F6C]" />}
                  </div>

                  {/* Name + size */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate text-[#E6F0EE]">{pf.file.name}</div>
                    <div className="text-[10px] text-[#5F6F6C]">{fmtSize(pf.file.size)}</div>
                  </div>

                  {/* Category selector (pending only) */}
                  {isPending && (
                    <select
                      value={pf.category}
                      onChange={e => setPending(prev => prev.map(p => p.id === pf.id ? { ...p, category: e.target.value } : p))}
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] bg-[#050608] border border-[rgba(94,234,212,0.15)] rounded px-1.5 py-1 text-[#E6F0EE] focus:outline-none focus:border-[rgba(94,234,212,0.3)]"
                    >
                      {UPLOAD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  )}

                  {/* Category badge (non-pending) */}
                  {!isPending && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[pf.category] ?? CATEGORY_COLORS.other}`}>
                      {pf.category}
                    </span>
                  )}

                  {/* Status badge (non-pending) */}
                  {!isPending && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      pf.status === "done"       ? "text-[#34D399] bg-[rgba(52,211,153,0.1)]  border-[rgba(52,211,153,0.2)]"
                      : pf.status === "error"    ? "text-[#F87171] bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)]"
                      : "text-accent bg-[rgba(94,234,212,0.1)] border-[rgba(94,234,212,0.2)]"
                    }`}>
                      {pf.status === "uploading" ? "…" : pf.status === "done" ? "Done" : "Failed"}
                    </span>
                  )}

                  {/* Remove button (pending + not currently uploading) */}
                  {isPending && !isUploading && (
                    <button
                      type="button"
                      onClick={() => setPending(prev => prev.filter(p => p.id !== pf.id))}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-[#5F6F6C] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Drop zone (hidden while uploading) */}
        {!isUploading && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all select-none ${
              dragOver
                ? "border-accent bg-[rgba(94,234,212,0.06)]"
                : "border-[rgba(94,234,212,0.15)] hover:border-[rgba(94,234,212,0.4)] hover:bg-[rgba(94,234,212,0.02)]"
            }`}
          >
            <Upload className="w-4 h-4 text-[#5F6F6C] mx-auto mb-1" />
            <p className="text-[11px] text-[#5F6F6C]">
              Drop files here or <span className="text-accent underline decoration-dotted">click to browse</span>
            </p>
            <p className="text-[10px] text-[#5F6F6C] mt-0.5">PDF · PNG · JPG · DWG · DXF · DOCX · XLSX — max 50 MB</p>

            <div className="mt-2 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-[#5F6F6C]">Category:</span>
              <select
                value={defaultCat}
                onChange={e => setDefaultCat(e.target.value)}
                className="text-[10px] bg-[#050608] border border-[rgba(94,234,212,0.15)] rounded px-2 py-1 text-[#E6F0EE] focus:outline-none focus:border-[rgba(94,234,212,0.3)]"
              >
                {UPLOAD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Uploading placeholder */}
        {isUploading && (
          <div className="border-2 border-dashed border-[rgba(94,234,212,0.2)] rounded-xl p-3.5 text-center opacity-60">
            <p className="text-[11px] text-[#5F6F6C]">Uploading files…</p>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.docx,.xlsx"
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>
    );
  },
);
