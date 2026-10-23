import type { LoanApplication, LoanPurpose } from "../../types/los";
import { formatINR, formatINRLakh } from "../../utils/formatters";
import { StatusPill } from "../shared/Header";
import { PolicyRuler } from "../shared/PolicyRuler";

/** Reducing-balance EMI. */
export function reducingEmi(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRatePct / (12 * 100);
  if (r === 0) return principal / tenureMonths;
  const f = (1 + r) ** tenureMonths;
  return (principal * r * f) / (f - 1);
}

export const PURPOSE_LABEL: Record<LoanPurpose, string> = {
  HOME_RENOVATION: "home renovation",
  WORKING_CAPITAL: "working capital",
  DEBT_CONSOLIDATION: "debt consolidation",
  MEDICAL_EMERGENCY: "a medical emergency",
  EDUCATION: "education",
};

function routingSentence(app: LoanApplication): string {
  const m = app.metrics;
  const rules = app.policyRules ?? [];
  const failed = rules.filter((r) => r.outcome === "AUTO_REJECT");
  const review = rules.filter((r) => r.outcome === "MANUAL_REVIEW");
  const foir = m ? `${m.foirPercentage.toFixed(1)}%` : "";

  switch (app.status) {
    case "AUTO_APPROVED":
      return "Auto-approved: every policy rule passed.";
    case "APPROVED":
      return "Approved by the underwriter.";
    case "OFFER_GENERATED":
      return "Offer issued and waiting for the borrower to sign.";
    case "DISBURSED":
      return "Signed by the borrower and disbursed.";
    case "REJECTED": {
      if (failed.length > 0) {
        const first = failed[0];
        return `Declined: ${first.metricName.replaceAll("_", " ")} at ${first.actualValue} breaches ${first.thresholdDescription}.`;
      }
      return "Declined after review.";
    }
    case "MANUAL_REVIEW": {
      if (m && m.foirPercentage > 55) {
        return `Routed to review: FOIR ${foir} exceeds the 55% cap.`;
      }
      if (m && m.foirPercentage > 45) {
        return `Routed to review: FOIR ${foir} sits in the 45–55% review band.`;
      }
      if (review.length > 0) {
        return `Routed to review: ${review[0].metricName.replaceAll("_", " ")} needs a second look.`;
      }
      return "Routed to review by the policy agent.";
    }
    default:
      return "Underwriting in progress.";
  }
}

interface DecisionSummaryProps {
  application: LoanApplication;
  counterTerms?: { amount: number; tenure: number };
  onRun?: () => void;
  isRunning?: boolean;
}

export function DecisionSummary({
  application,
  counterTerms,
  onRun,
  isRunning,
}: DecisionSummaryProps) {
  const { applicant, loanRequest, metrics } = application;
  const purpose = PURPOSE_LABEL[loanRequest.purpose] ?? "a personal need";

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">
          {applicant.fullName}
        </h1>
        <p className="mt-0.5 text-[14px] text-graphite">
          Asking for{" "}
          <span className="num font-medium text-ink">
            {formatINRLakh(loanRequest.amount)}
          </span>{" "}
          over <span className="num">{loanRequest.tenureMonths}</span> months
          for {purpose}.
        </p>
      </div>
      <StatusPill status={application.status} />
    </div>
  );

  if (!metrics) {
    return (
      <section className="sheet p-5 sm:p-6" aria-label="Decision summary">
        {header}
        <div className="mt-5 flex flex-col items-start gap-3 rounded-md bg-sunken px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-graphite">
            This file hasn't been underwritten yet. Agents will verify
            documents, check the bureau over A2A and apply policy.
          </p>
          {onRun && (
            <button
              type="button"
              className="btn btn-agent shrink-0"
              onClick={onRun}
              disabled={isRunning}
            >
              {isRunning ? "Underwriting…" : "Run underwriting"}
            </button>
          )}
        </div>
      </section>
    );
  }

  let counterFoir: number | undefined;
  let counterEmi: number | undefined;
  if (counterTerms) {
    counterEmi = reducingEmi(
      counterTerms.amount,
      metrics.annualInterestRatePct,
      counterTerms.tenure,
    );
    counterFoir =
      metrics.verifiedMonthlyIncome > 0
        ? ((metrics.existingEmiOutflow + counterEmi) /
            metrics.verifiedMonthlyIncome) *
          100
        : undefined;
  } else if (application.counterOffer) {
    counterFoir = application.counterOffer.projectedFoir;
    counterEmi = application.counterOffer.recommendedEmi;
  }

  const figures: { label: string; value: string; hint?: string }[] = [
    {
      label: "Bureau score",
      value: String(
        application.bureauReport?.bureauScore ?? metrics.bureauScore,
      ),
      hint: application.bureauReport?.bureauProvider,
    },
    {
      label: "Verified income",
      value: formatINR(metrics.verifiedMonthlyIncome),
      hint: "per month",
    },
    {
      label: "FOIR",
      value: `${metrics.foirPercentage.toFixed(1)}%`,
      hint: "as requested",
    },
    {
      label: "EMI",
      value: formatINR(metrics.proposedEmi),
      hint: `at ${metrics.annualInterestRatePct.toFixed(2)}%`,
    },
  ];

  return (
    <section className="sheet" aria-label="Decision summary">
      <div className="p-5 sm:p-6">
        {header}
        <p className="mt-3 text-[14px] font-medium text-ink">
          {routingSentence(application)}
        </p>
      </div>

      <dl className="grid grid-cols-2 border-t border-rule sm:grid-cols-4">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`px-5 py-4 sm:px-6 ${i % 2 === 1 ? "border-l border-rule" : ""} ${i >= 2 ? "border-t border-rule sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
          >
            <dt className="text-[12px] text-graphite">{f.label}</dt>
            <dd className="num mt-0.5 text-[20px] font-semibold tracking-tight text-ink">
              {f.value}
            </dd>
            {f.hint && <dd className="text-[12px] text-faint">{f.hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="border-t border-rule px-5 pt-4 pb-5 sm:px-6">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Debt burden against policy</h2>
          {counterFoir !== undefined && counterEmi !== undefined && (
            <span className="text-[12px] text-graphite">
              Counter-offer EMI{" "}
              <span className="num font-medium text-ink">
                {formatINR(counterEmi)}
              </span>
            </span>
          )}
        </div>
        <PolicyRuler
          requestedFoir={metrics.foirPercentage}
          counterFoir={counterFoir}
        />
      </div>
    </section>
  );
}
