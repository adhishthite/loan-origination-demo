import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  History,
  Moon,
  Network,
  Sun,
  User,
  XCircle,
} from "lucide-react";
import type { DemoPersonaPreset } from "../../types/los";

interface HeaderProps {
  personas: DemoPersonaPreset[];
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
  activeView: "borrower" | "underwriter";
  onSelectView: (view: "borrower" | "underwriter") => void;
  onOpenA2aModal: () => void;
  onOpenAuditDrawer: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  auditCount: number;
}

export function Header({
  personas,
  activePersonaId,
  onSelectPersona,
  activeView,
  onSelectView,
  onOpenA2aModal,
  onOpenAuditDrawer,
  isDarkMode,
  onToggleTheme,
  auditCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/95 backdrop-blur-sm transition-colors duration-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand & System Badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                  Loan Origination System
                </span>
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-600 dark:text-blue-400">
                  ADK + A2A
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-faint)]">
                Autonomous underwriting and multi-agent federation
              </p>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-[var(--border-subtle)] lg:block" />

          {/* Persona Presets */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <span className="text-[11px] text-[var(--text-muted)]">
              Persona:
            </span>
            {personas.map((p) => {
              const isActive = p.id === activePersonaId;
              let icon = (
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              );
              if (p.badgeColor === "amber") {
                icon = (
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                );
              } else if (p.badgeColor === "rose") {
                icon = (
                  <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                );
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPersona(p.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  }`}
                  title={p.summary}
                >
                  {icon}
                  <span>{p.name.split(" ")[0]}</span>
                  <span
                    className={`rounded px-1 text-[10px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--bg-card)] text-[var(--text-faint)]"
                    }`}
                  >
                    {p.badgeColor === "emerald"
                      ? "STP"
                      : p.badgeColor === "amber"
                        ? "Counter"
                        : "Reject"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Mode Switcher */}
        <div className="flex items-center rounded-md bg-[var(--bg-muted)] p-0.5 ring-1 ring-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => onSelectView("borrower")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
              activeView === "borrower"
                ? "bg-[var(--bg-card)] text-blue-600 shadow-xs dark:text-blue-400"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Borrower Portal</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectView("underwriter")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
              activeView === "underwriter"
                ? "bg-[var(--bg-card)] text-blue-600 shadow-xs dark:text-blue-400"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Underwriter Workbench</span>
          </button>
        </div>

        {/* Right Tools (A2A Modal, Audit Drawer, Dark Mode) */}
        <div className="flex items-center gap-2">
          {/* A2A & ADK Protocol Inspector Button */}
          <button
            type="button"
            onClick={onOpenA2aModal}
            className="flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-50/50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            title="Inspect Google ADK Multi-Agent Graph and live A2A Protocol Wire"
          >
            <Network className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Inspect A2A Protocol</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
          </button>

          {/* Audit Log Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenAuditDrawer}
            className="relative flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            title="View Immutable Audit Log"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Audit Trail</span>
            {auditCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 font-mono text-[10px] font-semibold text-white">
                {auditCount}
              </span>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
