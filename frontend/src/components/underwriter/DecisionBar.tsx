import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApplicationStatus, LoanApplication } from "../../types/los";
import { formatDateTime, formatINRLakh } from "../../utils/formatters";
import { StatusPill } from "../shared/Header";

type Decision = "APPROVE" | "APPROVE_COUNTER" | "REJECT";

interface DecisionBarProps {
  application: LoanApplication;
  counterTerms?: { amount: number; tenure: number };
  onDecision: (
    decision: Decision,
    notes: string,
    counterAmount?: number,
    counterTenure?: number,
  ) => void;
  isSubmitting: boolean;
}

const FINAL: ApplicationStatus[] = [
  "AUTO_APPROVED",
  "APPROVED",
  "OFFER_GENERATED",
  "DISBURSED",
  "REJECTED",
];

export function DecisionBar({
  application,
  counterTerms,
  onDecision,
  isSubmitting,
}: DecisionBarProps) {
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<Decision | null>(null);

  const counterAmount =
    counterTerms?.amount ?? application.counterOffer?.recommendedAmount;
  const counterTenure =
    counterTerms?.tenure ?? application.counterOffer?.recommendedTenureMonths;
  const hasCounter = counterAmount !== undefined && counterTenure !== undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset note per file
  useEffect(() => {
    setNotes("");
  }, [application.id]);

  useEffect(() => {
    if (counterTerms) {
      setNotes(
        `Restructured to ${formatINRLakh(counterTerms.amount)} over ${counterTerms.tenure} months to bring FOIR within policy.`,
      );
    }
  }, [counterTerms]);

  useEffect(() => {
    if (!isSubmitting) setPending(null);
  }, [isSubmitting]);

  if (!application.metrics) return null;

  if (FINAL.includes(application.status)) {
    const last = [...(application.auditLog ?? [])]
      .reverse()
      .find((e) => e.newStatus === application.status);
    return (
      <section
        aria-label="Decision"
        className="sheet sticky bottom-4 z-30 flex flex-wrap items-center gap-3 px-5 py-3 shadow-lg sm:px-6"
      >
        <span className="text-[13px] font-semibold text-ink">
          Decision recorded
        </span>
        <StatusPill status={application.status} />
        {last && (
          <span className="num text-[12px] text-graphite">
            by {last.actor} on {formatDateTime(last.timestamp)}
          </span>
        )}
      </section>
    );
  }

  const decide = (d: Decision) => {
    setPending(d);
    if (d === "APPROVE_COUNTER") {
      onDecision(d, notes, counterAmount, counterTenure);
    } else {
      onDecision(d, notes);
    }
  };

  const spinner = (d: Decision) =>
    isSubmitting && pending === d ? (
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
    ) : null;

  return (
    <section
      aria-label="Decision"
      className="sheet sticky bottom-4 z-30 px-4 py-3 shadow-lg sm:px-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="officer-note" className="label">
            Officer note for the audit trail
          </label>
          <input
            id="officer-note"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why this decision"
            className="field text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => decide("REJECT")}
            className="btn btn-secondary text-decline"
          >
            {spinner("REJECT")}
            Decline application
          </button>
          {hasCounter && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => decide("APPROVE_COUNTER")}
              className="btn btn-secondary"
              title={`${formatINRLakh(counterAmount)} over ${counterTenure} months`}
            >
              {spinner("APPROVE_COUNTER")}
              Send counter-offer
              <span className="num font-normal text-graphite">
                {formatINRLakh(counterAmount)}, {counterTenure} mo
              </span>
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => decide("APPROVE")}
            className="btn btn-primary"
          >
            {spinner("APPROVE")}
            Approve as requested
          </button>
        </div>
      </div>
    </section>
  );
}
