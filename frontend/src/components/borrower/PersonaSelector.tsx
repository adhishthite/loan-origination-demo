import { CheckCircle2, Clock, Sparkles, XCircle } from "lucide-react";
import type { DemoPersonaPreset } from "../../types/los";
import { formatINRLakh } from "../../utils/formatters";

interface PersonaSelectorProps {
  personas: DemoPersonaPreset[];
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
}

export function PersonaSelector({
  personas,
  activePersonaId,
  onSelectPersona,
}: PersonaSelectorProps) {
  if (!personas || !Array.isArray(personas) || personas.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Select Demo Scenario
          </h2>
          <p className="text-xs text-[var(--text-faint)]">
            Load pre-configured loan profiles demonstrating end-to-end
            multi-agent underwriting behaviors
          </p>
        </div>
        <span className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
          <Sparkles className="h-3 w-3" /> 1-Click Fast Fill
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {personas.map((persona: any) => {
          const isSelected = persona.id === activePersonaId;
          const badgeColor =
            persona.badgeColor ||
            (persona.badge_variant === "success"
              ? "emerald"
              : persona.badge_variant === "warning"
                ? "amber"
                : "rose");
          const isStp = badgeColor === "emerald";
          const isCounter = badgeColor === "amber";

          const amount =
            persona.loanRequest?.amount ??
            persona.loan_request?.amount ??
            1000000;
          const tenure =
            persona.loanRequest?.tenureMonths ??
            persona.loan_request?.tenure_months ??
            36;
          const pan =
            persona.applicant?.taxId ??
            persona.applicant?.tax_id ??
            "ABCDE1234F";
          const title = persona.title || persona.subtitle || "";
          const summary = persona.summary || persona.description || "";

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona.id)}
              className={`group relative flex flex-col rounded-xl p-4 text-left transition-all ${
                isSelected
                  ? "border-2 border-blue-500 bg-[var(--bg-card)] shadow-md ring-2 ring-blue-500/20"
                  : "border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-xs"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isStp
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : isCounter
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {isStp ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isCounter ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {persona.badge}
                </span>

                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {formatINRLakh(amount)}
                </span>
              </div>

              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {persona.name}
              </div>

              <div className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">
                {title}
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-faint)]">
                {summary}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-muted)]">
                <span>Tenure: {tenure}m</span>
                <span>PAN: {pan}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
