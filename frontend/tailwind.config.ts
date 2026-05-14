import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // InlineIQ exact palette
        background: "#050608",
        foreground: "#E6F0EE",
        surface: "#0a0d10",
        "surface-elevated": "#0f1418",
        "surface-high": "#141b1f",
        border: "rgba(94,234,212,0.12)",
        "border-strong": "rgba(94,234,212,0.22)",
        muted: "#5F6F6C",
        "muted-bright": "#9AAAA7",

        // Teal accent
        accent: "#5EEAD4",
        "accent-bright": "#2DE1C9",
        "accent-deep": "#14B8A6",
        "accent-soft": "rgba(94,234,212,0.08)",
        "accent-glow": "rgba(94,234,212,0.55)",

        // Semantic
        success: "#34D399",
        "success-soft": "rgba(52,211,153,0.08)",
        warning: "#FBBF24",
        "warning-soft": "rgba(251,191,36,0.08)",
        danger: "#F87171",
        "danger-soft": "rgba(248,113,113,0.08)",
        info: "#22D3EE",
        "info-soft": "rgba(34,211,238,0.08)",
        violet: "#A78BFA",

        // Status pills
        "status-healthy": "#34D399",
        "status-warning": "#FBBF24",
        "status-critical": "#F87171",
        "status-neutral": "#5F6F6C",

        // Operational surfaces
        "ops-panel": "#0a0d10",
        "ops-border": "rgba(94,234,212,0.12)",
        "ops-glow": "rgba(94,234,212,0.06)",

        // Data viz
        chart: { 1: "#5EEAD4", 2: "#22D3EE", 3: "#34D399", 4: "#A78BFA", 5: "#FBBF24" },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: { sm: "6px", md: "8px", lg: "14px", xl: "22px", full: "999px" },
      boxShadow: {
        "glow-teal": "0 0 0 1px rgba(45,225,201,0.6), 0 0 40px rgba(45,225,201,0.35)",
        "glow-teal-sm": "0 0 20px rgba(45,225,201,0.18)",
        "card": "0 0 0 1px rgba(94,234,212,0.08), 0 2px 8px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideUp: { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
