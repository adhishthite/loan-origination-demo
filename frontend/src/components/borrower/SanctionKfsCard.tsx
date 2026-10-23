import { CheckCircle2, Clock, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { LoanApplication, PolicyRuleResult } from "../../types/los";
import { formatDate, formatINR, formatPercent } from "../../utils/formatters";

interface SanctionKfsCardProps {
  application: LoanApplication;
  onAcceptOffer: (signatureName: string) => void;
  onSwitchToUnderwriter: () => void;
}

const ADVERSE_REASONS: Record<string, string> = {
  ERR_FOIR_EXCEEDED: "Repayments would exceed 55% of your income",
  ERR_BUREAU_SCORE_LOW: "Your credit score is below our minimum",
  ERR_BUREAU_DELINQUENCY_HIGH:
    "Your credit report shows recent missed repayments",
  ERR_BANK_BOUNCES_HIGH:
    "Your bank statement shows bounced payments in the last 6 months",
  ERR_INCOME_VARIANCE_CRITICAL:
    "The income on your documents is well below the income you declared",
  ERR_AGE_OUT_OF_BOUNDS: "Your age is outside our eligible range",
};

function reasonFor(rule: PolicyRuleResult): string {
  const code = rule.adverseActionCode ?? "";
  return (
    ADVERSE_REASONS[code] ??
    `${rule.metricName ?? "Policy rule"} did not meet our policy`
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[13px] text-graphite">{term}</dt>
      <dd className="num text-[14px] font-medium text-ink">{value}</dd>
    </div>
  );
}

export function SanctionKfsCard({
  application,
  onAcceptOffer,
  onSwitchToUnderwriter,
}: SanctionKfsCardProps) {
  const [draft, setDraft] = useState<{ appId: string; value: string }>();
  const signature =
    draft && draft.appId === application.id
      ? draft.value
      : (application.applicant?.fullName ?? "");
  const setSignature = (value: string) =>
    setDraft({ appId: application.id, value });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { kfs, status, counterOffer } = application;
  const rules = application.policyRules ?? [];
  const isApproved =
    status === "AUTO_APPROVED" ||
    status === "APPROVED" ||
    status === "OFFER_GENERATED";

  const handleSign = () => {
    if (!signature.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onAcceptOffer(signature.trim());
      setIsSubmitting(false);
    }, 600);
  };

  if (status === "DISBURSED") {
    const reference = `CD-${(application.id ?? "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-8)
      .toUpperCase()}`;
    return (
      <section className="rounded-lg border border-approve/30 bg-approve-tint p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-approve" />
          <div className="min-w-0 space-y-1">
            <h2 className="section-title">Loan disbursed</h2>
            <p className="text-[13px] text-ink">
              <span className="num font-semibold">
                {formatINR(
                  kfs?.sanctionedAmount ?? application.loanRequest?.amount ?? 0,
                )}
              </span>{" "}
              has been sent to your account.
            </p>
            <p className="text-[13px] text-graphite">
              Reference <span className="num text-ink">{reference}</span>
              {application.updatedAt
                ? `, ${formatDate(application.updatedAt)}`
                : ""}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "REJECTED") {
    const reasons = rules.filter((r) => r.outcome === "AUTO_REJECT");
    return (
      <section className="rounded-lg border border-decline/30 bg-decline-tint p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-decline" />
          <div className="min-w-0 space-y-3">
            <div>
              <h2 className="section-title">
                We can't approve this application
              </h2>
              <p className="mt-1 text-[13px] text-graphite">
                Under our credit policy, the application was declined for these
                reasons:
              </p>
            </div>
            <ul className="space-y-1.5 text-[13px] text-ink">
              {reasons.length > 0 ? (
                reasons.map((r) => (
                  <li key={r.ruleId} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-decline"
                    />
                    {reasonFor(r)}
                  </li>
                ))
              ) : (
                <li>The application did not meet our credit policy.</li>
              )}
            </ul>
            <p className="border-t border-decline/20 pt-3 text-[12px] text-graphite">
              You can request a free copy of your credit report from the bureau
              within 60 days.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "MANUAL_REVIEW") {
    return (
      <section className="rounded-lg border border-review/30 bg-review-tint p-5">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-review" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="section-title">
                Your application is with an underwriter
              </h2>
              <p className="mt-1 text-[13px] text-graphite">
                The amount you asked for is above what policy allows
                automatically. An underwriter will confirm the terms.
              </p>
            </div>

            {counterOffer && (
              <div className="rounded-md border border-review/20 bg-sheet px-3 py-1">
                <p className="pt-2 text-[12px] font-medium text-graphite">
                  Suggested terms
                </p>
                <dl className="divide-y divide-rule">
                  <Row
                    term="Amount"
                    value={formatINR(counterOffer.recommendedAmount ?? 0)}
                  />
                  <Row
                    term="Tenure"
                    value={`${counterOffer.recommendedTenureMonths ?? "—"} months`}
                  />
                  <Row
                    term="Monthly EMI"
                    value={formatINR(counterOffer.recommendedEmi ?? 0)}
                  />
                  {typeof counterOffer.projectedFoir === "number" && (
                    <Row
                      term="Repayments as share of income"
                      value={formatPercent(counterOffer.projectedFoir)}
                    />
                  )}
                </dl>
              </div>
            )}

            <button
              type="button"
              onClick={onSwitchToUnderwriter}
              className="btn btn-ghost -ml-2 px-2"
            >
              Open in Underwriter view
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isApproved && kfs) {
    return (
      <section className="sheet" aria-labelledby="offer-title">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h2 id="offer-title" className="section-title">
            Your offer
          </h2>
          <span className="pill pill-approve">
            {status === "AUTO_APPROVED" ? "Approved instantly" : "Approved"}
          </span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[12px] text-graphite">Sanctioned amount</p>
          <p className="num text-[28px] font-semibold leading-tight tracking-tight">
            {formatINR(kfs.sanctionedAmount ?? 0)}
          </p>
          <dl className="mt-3 divide-y divide-rule border-t border-rule">
            <Row
              term="Interest rate"
              value={`${formatPercent(kfs.annualInterestRatePct ?? 0, 2)} p.a.`}
            />
            <Row term="Monthly EMI" value={formatINR(kfs.monthlyEmi ?? 0)} />
            <Row term="Tenure" value={`${kfs.tenureMonths ?? "—"} months`} />
            <Row
              term="Processing fee"
              value={formatINR(kfs.processingFeeAmount ?? 0)}
            />
            <Row
              term="APR"
              value={formatPercent(kfs.effectiveAprPct ?? 0, 2)}
            />
            <Row
              term="Total payable"
              value={formatINR(kfs.totalAmountPayable ?? 0)}
            />
          </dl>
        </div>

        <div className="mt-2 space-y-3 border-t border-rule px-5 py-4">
          <div>
            <label htmlFor="esign-name-input" className="label">
              Sign with your full name
            </label>
            <input
              id="esign-name-input"
              type="text"
              autoComplete="name"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="field"
            />
          </div>
          <button
            type="button"
            disabled={!signature.trim() || isSubmitting}
            onClick={handleSign}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing…
              </>
            ) : (
              "Sign and accept"
            )}
          </button>
          <p className="text-[12px] text-faint">
            Signing accepts the key facts above and starts disbursement.
          </p>
        </div>
      </section>
    );
  }

  if (isApproved) {
    return (
      <p className="px-1 text-[13px] text-faint">
        Approved. Preparing your offer.
      </p>
    );
  }

  return (
    <p className="px-1 text-[13px] text-faint">
      Your offer will appear here after underwriting.
    </p>
  );
}
