/** Pegasus Design — Toast Notification System */
"use client";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

type ToastType = "success" | "error";
interface ToastItem { id: number; message: string; type: ToastType; }

// Module-level singleton — last mounted Toaster wins (safe since one page renders at a time)
let _add: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
  _add?.(message, type);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _add = (message, type) => {
      const id = Date.now();
      setItems(prev => [...prev, { id, message, type }]);
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { _add = null; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl pointer-events-auto animate-in",
            t.type === "success"
              ? "bg-[#0d2e29] border border-[rgba(52,211,153,0.35)] text-[#34D399]"
              : "bg-[#2a0e0e] border border-[rgba(248,113,113,0.35)] text-[#F87171]"
          )}
        >
          {t.type === "success"
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />
          }
          {t.message}
        </div>
      ))}
    </div>
  );
}
