/** Pegasus Design — Operational State Architecture */
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────
export interface ProjectSummary {
  id: string; customer_id: string; customer_name?: string;
  name: string; project_type: string; status: string;
  risk_level: string; target_completion?: string;
  estimated_total: number; margin_actual?: number;
}
export interface InstallSummary {
  id: string; project_id: string; project_name: string;
  status: string; scheduled_date: string;
  address?: string; lead_installer?: string;
}
export interface EventSummary {
  id: string; event_type: string; entity_type?: string;
  actor?: string; severity: string; created_at: string;
}
export interface AIRecommendationSummary {
  id: string; title: string; category: string;
  description: string; reasoning: string;
  confidence: number; expected_impact: string; status: string;
}
export interface DashboardSnapshot {
  active_projects: number; projects_at_risk: number;
  overdue_tasks: number; scheduled_installs: number;
  open_callbacks: number; inventory_alerts: number;
  labor_utilization: number; pending_recommendations: number;
  margin_health: "healthy" | "warning" | "critical";
  capacity_status: "ok" | "warning" | "critical";
  at_risk_projects: ProjectSummary[];
  installs_this_week: InstallSummary[];
  recent_events: EventSummary[];
  top_recommendations: AIRecommendationSummary[];
}

interface AppState {
  // Dashboard
  dashboard: DashboardSnapshot | null;
  dashboardLoading: boolean;
  dashboardError: string | null;

  // AI Mode
  aiMode: "observe" | "assist" | "automate";

  // Navigation
  activeModule: string;

  // Telemetry
  eventCount: number;
  lastEvent: EventSummary | null;

  // WebSocket
  wsConnected: boolean;

  // Actions
  setDashboard: (data: DashboardSnapshot) => void;
  setDashboardLoading: (v: boolean) => void;
  setDashboardError: (e: string | null) => void;
  setAiMode: (mode: "observe" | "assist" | "automate") => void;
  setActiveModule: (module: string) => void;
  addEvent: (event: EventSummary) => void;
  setWsConnected: (v: boolean) => void;
  acceptRecommendation: (id: string) => void;
  dismissRecommendation: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,
  aiMode: "observe",
  activeModule: "dashboard",
  eventCount: 0,
  lastEvent: null,
  wsConnected: false,

  setDashboard: (data) => set({ dashboard: data, dashboardLoading: false, dashboardError: null }),
  setDashboardLoading: (v) => set({ dashboardLoading: v }),
  setDashboardError: (e) => set({ dashboardError: e, dashboardLoading: false }),
  setAiMode: (mode) => set({ aiMode: mode }),
  setActiveModule: (module) => set({ activeModule: module }),
  addEvent: (event) => set((s) => ({ eventCount: s.eventCount + 1, lastEvent: event })),
  setWsConnected: (v) => set({ wsConnected: v }),
  acceptRecommendation: (id) => {
    const d = get().dashboard;
    if (!d?.top_recommendations) return;
    set({
      dashboard: {
        ...d,
        top_recommendations: d.top_recommendations.map((r) =>
          r.id === id ? { ...r, status: "accepted" } : r
        ),
        pending_recommendations: Math.max(0, d.pending_recommendations - 1),
      },
    });
  },
  dismissRecommendation: (id) => {
    const d = get().dashboard;
    if (!d?.top_recommendations) return;
    set({
      dashboard: {
        ...d,
        top_recommendations: d.top_recommendations.filter((r) => r.id !== id),
        pending_recommendations: Math.max(0, d.pending_recommendations - 1),
      },
    });
  },
}));
