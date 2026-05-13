/** Pegasus Design — Zustand Store (Global State) */
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────

export interface DashboardSnapshot {
  active_projects: number;
  projects_at_risk: number;
  overdue_tasks: number;
  scheduled_installs: number;
  open_callbacks: number;
  inventory_alerts: number;
  labor_utilization: number;
  pending_recommendations: number;
  margin_health: "healthy" | "warning" | "critical";
  capacity_status: "ok" | "warning" | "critical";
  at_risk_projects: ProjectSummary[];
  installs_this_week: InstallSummary[];
  recent_events: EventSummary[];
  top_recommendations: AIRecommendationSummary[];
  kpis: Record<string, number>;
}

export interface ProjectSummary {
  id: string;
  customer_id: string;
  customer_name?: string;
  name: string;
  project_type: string;
  status: string;
  risk_level: string;
  target_completion?: string;
  install_date?: string;
  estimated_total: number;
  margin_actual?: number;
  overdue?: string;
}

export interface InstallSummary {
  id: string;
  project_id: string;
  project_name: string;
  status: string;
  scheduled_date: string;
  address?: string;
  lead_installer?: string;
}

export interface EventSummary {
  id: string;
  event_type: string;
  entity_type?: string;
  actor?: string;
  payload: Record<string, unknown>;
  severity: string;
  created_at: string;
}

export interface AIRecommendationSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  reasoning: string;
  confidence: number;
  expected_impact: string;
  status: string;
  requires_approval?: string;
  created_at: string;
}

// ── Store ──────────────────────────────────────────────────────

interface AppState {
  // Dashboard
  dashboard: DashboardSnapshot | null;
  dashboardLoading: boolean;

  // AI Mode
  aiMode: "observe" | "assist" | "automate";

  // Navigation
  activeModule: string;

  // Actions
  setDashboard: (data: DashboardSnapshot) => void;
  setDashboardLoading: (loading: boolean) => void;
  setAiMode: (mode: "observe" | "assist" | "automate") => void;
  setActiveModule: (module: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dashboard: null,
  dashboardLoading: false,
  aiMode: "observe",
  activeModule: "dashboard",

  setDashboard: (data) => set({ dashboard: data, dashboardLoading: false }),
  setDashboardLoading: (loading) => set({ dashboardLoading: loading }),
  setAiMode: (mode) => set({ aiMode: mode }),
  setActiveModule: (module) => set({ activeModule: module }),
}));
