import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { PolicyRuleResult, RuleOutcome } from "../../types/los";

interface RuleScorecardProps {
  rules: PolicyRuleResult[];
}

export function RuleScorecard({ rules }: RuleScorecardProps) {
  const getOutcomeBadge = (outcome: RuleOutcome) => {
    switch (outcome) {
      case "AUTO_APPROVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            PASS
          </span>
        );
      case "MANUAL_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            REVIEW
          </span>
        );
      case "AUTO_REJECT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            KNOCKOUT
          </span>
        );
    }
  };

  const passCount = rules.filter((r) => r.outcome === "AUTO_APPROVE").length;
  const reviewCount = rules.filter((r) => r.outcome === "MANUAL_REVIEW").length;
  const rejectCount = rules.filter((r) => r.outcome === "AUTO_REJECT").length;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Deterministic Credit Policy Engine (POL-01..06)
          </h3>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
            TRD-09 / FR-09
          </span>
        </div>

        {/* Tally Counters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
            {passCount} Approved
          </span>
          {reviewCount > 0 && (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
              {reviewCount} Amber Review
            </span>
          )}
          {rejectCount > 0 && (
            <span className="rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-400">
              {rejectCount} Hard Knockout
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-muted)]">
              <th className="py-2 pr-3">Rule ID</th>
              <th className="py-2 pr-3">Policy Metric</th>
              <th className="py-2 pr-3">Actual Observed</th>
              <th className="py-2 pr-3">Policy Boundary Threshold</th>
              <th className="py-2 pr-3">Outcome</th>
              <th className="py-2">Adverse Action Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rules.map((rule) => {
              return (
                <tr
                  key={rule.ruleId}
                  className="hover:bg-[var(--bg-muted)]/50 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {rule.ruleId}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                    {rule.metricName}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)]">
                    {rule.actualValue}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--text-muted)]">
                    {rule.thresholdDescription}
                  </td>
                  <td className="py-2.5 pr-3">
                    {getOutcomeBadge(rule.outcome)}
                  </td>
                  <td className="py-2.5 font-mono text-[10px]">
                    {rule.adverseActionCode ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-700 dark:text-rose-400">
                        <ShieldAlert className="h-3 w-3" />
                        {rule.adverseActionCode}
                      </span>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
