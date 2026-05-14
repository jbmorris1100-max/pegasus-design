/** Pegasus Design — Client-side initialisation */
"use client";
import { useEffect } from "react";

export function ClientInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);

  return <>{children}</>;
}
