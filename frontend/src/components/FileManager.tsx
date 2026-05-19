/** Pegasus Design — Unified File Manager (shared across CRM, Projects, Estimates) */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/core";
import { Upload, Download, Trash2, Paperclip, FileText, Image, File, Eye, X } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api/v1`;
  return "";
}

function getUploadsBase(): string {
  return getApiBase().replace(/\/api\/v1$/, "");
}

/**
 * Resolve a file_url to a fully-qualified URL the browser can fetch.
 * New records store absolute https:// URLs (via RAILWAY_PUBLIC_DOMAIN).
 * Legacy records store relative /uploads/... paths — prepend the backend origin.
 */
function resolveUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${getUploadsBase()}${fileUrl}`;
}

function fmtSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf:  <FileText className="w-4 h-4 text-[#F87171]" />,
  png:  <Image    className="w-4 h-4 text-[#60A5FA]" />,
  jpg:  <Image    className="w-4 h-4 text-[#60A5FA]" />,
  jpeg: <Image    className="w-4 h-4 text-[#60A5FA]" />,
  dwg:  <File     className="w-4 h-4 text-[#FBBF24]" />,
  dxf:  <File     className="w-4 h-4 text-[#FBBF24]" />,
  docx: <FileText className="w-4 h-4 text-[#A78BFA]" />,
  xlsx: <FileText className="w-4 h-4 text-[#34D399]" />,
};

const CATEGORIES = [
  { value: "all",      label: "All" },
  { value: "plan",     label: "Plans" },
  { value: "contract", label: "Contracts" },
  { value: "estimate", label: "Estimates" },
  { value: "photo",    label: "Photos" },
  { value: "spec",     label: "Specs" },
  { value: "other",    label: "Other" },
];

const SOURCE_COLORS: Record<string, string> = {
  project:  "text-[#5EEAD4] bg-[rgba(94,234,212,0.08)] border-[rgba(94,234,212,0.2)]",
  estimate: "text-[#A78BFA] bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.2)]",
  crm:      "text-[#FBBF24] bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.2)]",
};

// ── Open / view logic ─────────────────────────────────────────────────────────

function openFile(f: any, setLightbox: (url: string) => void) {
  const url = resolveUrl(f.file_url);
  if (IMAGE_TYPES.has(f.file_type)) {
    setLightbox(url);
  } else if (f.file_type === "pdf") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = f.filename || f.display_name || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function triggerDownload(f: any) {
  const url = resolveUrl(f.file_url);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.filename || f.display_name || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  customerId:  string;
  projectId?:  string;
  estimateId?: string;
  title?:      string;
}

export function FileManager({ customerId, projectId, estimateId, title = "Files" }: Props) {
  const [files,          setFiles]          = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploading,      setUploading]      = useState(false);
  const [dragOver,       setDragOver]       = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [lightboxUrl,    setLightboxUrl]    = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function fetchFiles() {
    setLoading(true);
    try {
      const qs = activeCategory !== "all" ? `?category=${activeCategory}` : "";
      const d = await api.get(`/files/customer/${customerId}${qs}`);
      setFiles((d as any).items ?? []);
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (customerId) fetchFiles(); }, [customerId, activeCategory]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    const apiBase = getApiBase();

    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file",        file);
      fd.append("customer_id", customerId);
      if (projectId)  fd.append("project_id",  projectId);
      if (estimateId) fd.append("estimate_id", estimateId);
      fd.append("category",    uploadCategory);
      fd.append("uploaded_by", "staff");

      try {
        const res = await fetch(`${apiBase}/files/upload`, { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          toast(`Upload failed: ${err.detail}`, "error");
        } else {
          toast(`${file.name} uploaded`);
        }
      } catch {
        toast(`Failed to upload ${file.name}`, "error");
      }
    }

    setUploading(false);
    await fetchFiles();
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleDelete(fileId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/files/${fileId}`);
      toast("File deleted");
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch {
      toast("Failed to delete file", "error");
    }
  }

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); };
  const onDrop      = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); };

  const displayed = files.filter(f => activeCategory === "all" || f.category === activeCategory);

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-3.5 h-3.5 text-muted" />
        <span className="section-header">{title}</span>
        <span className="text-[10px] text-muted ml-0.5">({files.length})</span>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all border ${
              activeCategory === cat.value
                ? "bg-[rgba(94,234,212,0.12)] text-accent border-[rgba(94,234,212,0.3)]"
                : "text-muted hover:text-foreground bg-surface-elevated border-transparent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* File list */}
      {loading ? (
        <p className="text-muted text-xs py-4 text-center">Loading files…</p>
      ) : displayed.length === 0 ? (
        <p className="text-muted text-xs py-3 text-center">No files in this category.</p>
      ) : (
        <div className="space-y-1 mb-3">
          {displayed.map(f => {
            const isImage    = IMAGE_TYPES.has(f.file_type);
            const isViewable = isImage || f.file_type === "pdf";
            const resolvedUrl = resolveUrl(f.file_url);
            const displayName = f.display_name || f.filename;

            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-surface-elevated hover:border-accent/20 transition-all group"
              >
                {/* Image thumbnail OR file-type icon */}
                {isImage ? (
                  <button
                    className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-surface-high border border-border hover:border-accent/30 transition-colors"
                    onClick={() => setLightboxUrl(resolvedUrl)}
                    title="View image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex-shrink-0">{FILE_ICON[f.file_type] ?? <File className="w-4 h-4 text-muted" />}</div>
                )}

                {/* Name + metadata — clicking opens/views the file */}
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => openFile(f, setLightboxUrl)}
                  title={isViewable ? (isImage ? "View image" : "Open PDF") : "Download"}
                >
                  <div className="text-xs font-medium truncate hover:text-accent transition-colors cursor-pointer">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted">{fmtSize(f.file_size)}</span>
                    <span className="text-[10px] text-muted">·</span>
                    <span className="text-[10px] text-muted">{fmtDate(f.created_at)}</span>
                    {f.source && (
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${SOURCE_COLORS[f.source] ?? ""}`}>
                        {f.source}
                      </span>
                    )}
                    {f.category && f.category !== "other" && (
                      <span className="text-[9px] text-muted px-1.5 py-0.5 rounded bg-surface-high border border-border uppercase tracking-wider">
                        {f.category}
                      </span>
                    )}
                  </div>
                </button>

                {/* Action buttons (always visible) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* View / open button */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                    onClick={() => openFile(f, setLightboxUrl)}
                    title={isImage ? "View image" : f.file_type === "pdf" ? "Open PDF" : "Download"}
                  >
                    {isViewable ? <Eye className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  </button>

                  {/* Explicit download (only shown for viewable files so users can choose) */}
                  {isViewable && (
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => triggerDownload(f)}
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleDelete(f.id, displayName)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInput.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all select-none ${
          dragOver
            ? "border-accent bg-[rgba(94,234,212,0.06)]"
            : "border-[rgba(94,234,212,0.15)] hover:border-accent/40 hover:bg-[rgba(94,234,212,0.02)]"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {uploading ? (
          <div>
            <p className="text-[11px] text-muted mb-2">Uploading…</p>
            <div className="progress-bar mx-6"><div style={{ width: "60%", animation: "none" }} /></div>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted mx-auto mb-1.5" />
            <p className="text-[11px] text-muted">
              Drop files here or <span className="text-accent underline decoration-dotted">click to browse</span>
            </p>
            <p className="text-[10px] text-muted mt-0.5">PDF · PNG · JPG · DWG · DXF · DOCX · XLSX — max 50 MB</p>

            <div className="mt-2.5 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-muted">Upload as:</span>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
                className="text-[10px] bg-[#050608] border border-[rgba(94,234,212,0.15)] rounded px-2 py-1 text-foreground focus:outline-none focus:border-accent/30"
              >
                {CATEGORIES.filter(c => c.value !== "all").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.docx,.xlsx"
        className="hidden"
        onChange={e => handleUpload(e.target.files)}
      />

      {/* Image lightbox */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
