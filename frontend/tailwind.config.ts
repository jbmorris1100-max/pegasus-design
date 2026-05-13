import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pegasus Design palette — premium, industrial, modern
        background: "#08080A",
        foreground: "#E4E4E7",
        surface: "#0F0F14",
        "surface-elevated": "#16161D",
        border: "#23232E",
        muted: "#71717A",
        accent: "#F59E0B",       // Amber — primary accent
        "accent-strong": "#D97706",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        // Semantic status colors
        "status-healthy": "#22C55E",
        "status-warning": "#F59E0B",
        "status-critical": "#EF4444",
        // Data viz
        chart: {
          1: "#F59E0B",
          2: "#3B82F6",
          3: "#22C55E",
          4: "#A855F7",
          5: "#EF4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "DM Mono", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
