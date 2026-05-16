"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center max-w-md px-6">
        <div className="text-danger text-4xl font-bold mb-4">⚠</div>
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted mb-6">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="btn-primary btn-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
