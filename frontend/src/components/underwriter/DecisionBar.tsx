import {
  CheckCircle,
  FileSignature,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LoanApplication } from "../../types/los";
import { formatINR } from "../../utils/formatters";

interface DecisionBarProps {
  application: LoanApplication;
  counterTerms?: { amount: number; tenure: number };
  onDecision: (
    decision: "APPROVE" | "APPROVE_COUNTER" | "REJECT",
    notes: string,
    counterAmount?: number,
    counterTenure?: number,
  ) => void;
  isSubmitting: boolean;
}

export function DecisionBar({
  application,
  counterTerms,
  onDecision,
  isSubmitting,
}: DecisionBarProps) {
  const defaultNotes =
    application.status === "MANUAL_REVIEW"
      ? "Approved counter-offer of ₹11.5L @ 48 months. Debt servicing brought to 42.7% FOIR, consistent with Credit Committee policy limits."
      : "Application reviewed in accordance with standard FSI underwriting guidelines.";

  const [notes, setNotes] = useState(defaultNotes);

  useEffect(() => {
    if (counterTerms) {
      setNotes(
        `Approved restructuring to ${formatINR(counterTerms.amount)} over ${counterTerms.tenure} months to stabilize FOIR.`,
      );
    }
  }, [counterTerms]);

  const isTerminal =
    application.status === "AUTO_APPROVED" ||
    application.status === "APPROVED" ||
    application.status === "DISBURSED" ||
    application.status === "REJECTED";

  const effectiveCounterAmount =
    counterTerms?.amount ||
    application.counterOffer?.recommendedAmount ||
    1150000;
  const effectiveCounterTenure =
    counterTerms?.tenure ||
    application.counterOffer?.recommendedTenureMonths ||
    48;

  if (isTerminal) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 text-center">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Underwriting decision concluded. Application status:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {application.status}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Credit Officer Review and Decision Gate
          </h3>
        </div>
        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
          Human-in-the-loop review
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="credit-officer-notes"
            className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
          >
            Officer Justification and Audit Memo
          </label>
          <textarea
            id="credit-officer-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document officer review reason for immutable audit log..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Action Buttons in Active Voice */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Send Counter-Offer */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              onDecision(
                "APPROVE_COUNTER",
                notes,
                effectiveCounterAmount,
                effectiveCounterTenure,
              )
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-xs text-white shadow-xs transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>
              Send Counter-Offer ({formatINR(effectiveCounterAmount)} @{" "}
              {effectiveCounterTenure}m)
            </span>
          </button>

          {/* Approve Requested Terms */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDecision("APPROVE", notes)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-xs text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>Approve Requested Terms</span>
          </button>

          {/* Decline Application */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDecision("REJECT", notes)}
            className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-semibold text-xs text-rose-700 transition-colors hover:bg-rose-500/20 dark:text-rose-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>Decline Application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
