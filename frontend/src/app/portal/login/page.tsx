/** Pegasus Design — Client Portal Login */
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.origin}/api/v1`;
  return "";
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !code.trim()) { setError("Email and access code are required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBase()}/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), access_code: code.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail ?? "Invalid email or access code.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("portal_customer_id", data.customer_id);
      router.push("/portal/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020405] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#5EEAD4] flex items-center justify-center">
            <span className="text-[#001917] font-bold text-sm">P</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#E6F0EE]">PEGASUS</span>
        </div>

        <div className="bg-[#070a0d] border border-[rgba(94,234,212,0.12)] rounded-2xl p-8">
          <h1 className="text-lg font-semibold text-[#E6F0EE] mb-1">Client Portal</h1>
          <p className="text-[13px] text-[#5F6F6C] mb-6">Sign in to view your project progress and files.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] text-[#F87171] text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#5F6F6C] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#050608] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] placeholder:text-[#3a4a48] focus:outline-none focus:border-[rgba(94,234,212,0.35)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5F6F6C] uppercase tracking-wider mb-1.5">
                Access Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                autoComplete="one-time-code"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm font-mono tracking-[0.25em] bg-[#050608] border border-[rgba(94,234,212,0.12)] text-[#E6F0EE] placeholder:text-[#3a4a48] focus:outline-none focus:border-[rgba(94,234,212,0.35)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#5EEAD4] text-[#001917] text-sm font-semibold hover:bg-[#4DD4BE] active:bg-[#3ec4ae] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#3a4a48] mt-6">
          Your access code was provided by your project team.
        </p>
      </div>
    </div>
  );
}
