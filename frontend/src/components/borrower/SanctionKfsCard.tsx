import {
  CheckCircle2,
  Download,
  FileCheck,
  IndianRupee,
  Layers,
  Lock,
  PenTool,
  Percent,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { LoanApplication } from "../../types/los";
import { formatDate, formatINR, formatPercent } from "../../utils/formatters";

interface SanctionKfsCardProps {
  application: LoanApplication;
  onAcceptOffer: (signatureName: string) => void;
  onSwitchToUnderwriter: () => void;
}

export function SanctionKfsCard({
  application,
  onAcceptOffer,
  onSwitchToUnderwriter,
}: SanctionKfsCardProps) {
  const [signature, setSignature] = useState(application.applicant.fullName);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kfs = application.kfs;
  const status = application.status;
  const isApproved = status === "AUTO_APPROVED" || status === "APPROVED";
  const isDisbursed = status === "DISBURSED";
  const isManualReview = status === "MANUAL_REVIEW";
  const isRejected = status === "REJECTED";

  const handleSign = () => {
    if (!signature || !isAgreed) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onAcceptOffer(signature);
      setIsSubmitting(false);
    }, 600);
  };

  if (isDisbursed) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
                Loan Disbursed
              </h3>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                UTR: CMS-20261023-9841
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
              Sanction amount of{" "}
              <span className="font-semibold">
                {formatINR(
                  kfs?.sanctionedAmount || application.loanRequest.amount,
                )}
              </span>{" "}
              disbursed to account ending in ••••9841.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-emerald-500/20 pt-3 text-xs">
          <button
            type="button"
            onClick={() => alert("Sanction Letter PDF downloaded")}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 font-medium text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Sanction Document</span>
          </button>
          <span className="text-[11px] text-[var(--text-faint)]">
            Signed by {application.applicant.fullName} on{" "}
            {formatDate(new Date().toISOString())}
          </span>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-rose-950 text-sm dark:text-rose-100">
                Statutory Adverse Action Notice
              </h3>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-800 dark:text-rose-200">
                FR-12 Compliant
              </span>
            </div>
            <p className="mt-1 text-xs text-rose-800 dark:text-rose-300">
              Pursuant to RBI Fair Practices Code and credit underwriting policy
              guidelines, we regret to inform you that your application could
              not be approved at this time.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-rose-500/20 bg-[var(--bg-card)] p-4">
          <div className="mb-2 font-medium text-xs text-[var(--text-primary)]">
            Adverse Action Reason Codes:
          </div>
          <div className="space-y-2 text-xs">
            {application.policyRules
              .filter((r) => r.outcome === "AUTO_REJECT")
              .map((r) => (
                <div key={r.ruleId} className="flex items-start gap-2">
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    {r.adverseActionCode || r.ruleId}
                  </span>
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {r.metricName}:{" "}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {r.thresholdDescription} (Observed: {r.actualValue})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[var(--text-faint)]">
          Credit bureau information was provided by Experian / CRIF High Mark.
          You may obtain a free copy of your credit disclosure directly from the
          respective bureau within 60 days.
        </p>
      </div>
    );
  }

  if (isManualReview) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-950 text-sm dark:text-amber-100">
                  Application Under Human Review with AI Counter-Offer
                </h3>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                  Paused for Review
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200">
                Your requested loan of{" "}
                {formatINR(application.loanRequest.amount)} over{" "}
                {application.loanRequest.tenureMonths}m exceeded recommended
                debt-service ratio (FOIR). Our Policy Optimizer has formulated
                an affordable alternative.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchToUnderwriter}
            className="hidden items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 sm:flex"
          >
            <span>Review in Workbench</span>
          </button>
        </div>

        {application.counterOffer && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-[var(--bg-card)] p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="font-medium text-xs text-[var(--text-primary)]">
                Recommended Counter-Offer Terms
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Projected FOIR: {application.counterOffer.projectedFoir}%
                (Within Prudential Limit)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-[11px] text-[var(--text-faint)]">
                  Restructured Amount
                </span>
                <div className="font-bold text-base text-blue-600 dark:text-blue-400">
                  {formatINR(application.counterOffer.recommendedAmount)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-faint)]">
                  Extended Tenure
                </span>
                <div className="font-semibold text-base text-[var(--text-primary)]">
                  {application.counterOffer.recommendedTenureMonths} Months
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-faint)]">
                  Estimated Monthly EMI
                </span>
                <div className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  {formatINR(application.counterOffer.recommendedEmi)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-faint)]">
                  Monthly Cashflow Relief
                </span>
                <div className="font-semibold text-base text-[var(--text-primary)]">
                  ~₹19,792 / mo
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[var(--text-muted)]">
              <span className="font-semibold">Optimizer Rationale: </span>
              {application.counterOffer.rationale}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isApproved && kfs) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-[var(--bg-card)] p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Key Fact Statement (KFS)
                </h3>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {status === "AUTO_APPROVED"
                    ? "STP Instant Approval"
                    : "Underwriter Approved"}
                </span>
              </div>
              <span className="text-xs text-[var(--text-faint)]">
                Compliant with Reserve Bank of India (RBI) Digital Lending
                Directions
              </span>
            </div>
          </div>

          <div className="mt-2 text-right sm:mt-0">
            <span className="text-[10px] text-[var(--text-faint)]">
              KFS Identifier
            </span>
            <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              KFS-{application.id.toUpperCase()}-2026
            </div>
          </div>
        </div>

        {/* KFS Financial Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-[var(--bg-muted)] p-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
              <IndianRupee className="h-3 w-3" />
              <span>Sanctioned Principal</span>
            </div>
            <div className="mt-1 font-bold text-lg text-blue-600 dark:text-blue-400">
              {formatINR(kfs.sanctionedAmount)}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg-muted)] p-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
              <Percent className="h-3 w-3" />
              <span>Interest Rate (APR)</span>
            </div>
            <div className="mt-1 font-bold text-lg text-[var(--text-primary)]">
              {formatPercent(kfs.annualInterestRatePct)}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg-muted)] p-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
              <Layers className="h-3 w-3" />
              <span>Tenure</span>
            </div>
            <div className="mt-1 font-bold text-lg text-[var(--text-primary)]">
              {kfs.tenureMonths} Months
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg-muted)] p-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
              <IndianRupee className="h-3 w-3" />
              <span>Equated Monthly EMI</span>
            </div>
            <div className="mt-1 font-bold text-lg text-emerald-600 dark:text-emerald-400">
              {formatINR(kfs.monthlyEmi)}
            </div>
          </div>
        </div>

        {/* Schedule & Breakdown */}
        <div className="mt-4 rounded-lg border border-[var(--border-subtle)] p-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[var(--text-faint)]">
                Processing Fee (1.5%):
              </span>
              <div className="font-semibold text-[var(--text-primary)]">
                {formatINR(kfs.processingFeeAmount)}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-faint)]">
                Total Interest Payable:
              </span>
              <div className="font-semibold text-[var(--text-primary)]">
                {formatINR(kfs.totalInterestPayable)}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-faint)]">
                Total Amount Repayable:
              </span>
              <div className="font-semibold text-blue-600 dark:text-blue-400">
                {formatINR(kfs.totalAmountPayable)}
              </div>
            </div>
          </div>
        </div>

        {/* e-Signature Drawer */}
        <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
              <PenTool className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Electronic Signature & Acceptance</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              <Lock className="h-3 w-3" /> 256-bit Encrypted
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="esign-name-input"
                className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
              >
                Signatory Name (Matches Tax ID)
              </label>
              <input
                id="esign-name-input"
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-blue-600"
              />
              <span>
                I have reviewed the Key Fact Statement, repayment schedule, and
                agree to electronic execution & immediate disbursement under RBI
                Digital Lending Norms.
              </span>
            </label>

            <button
              type="button"
              disabled={!isAgreed || !signature || isSubmitting}
              onClick={handleSign}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-xs text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? "Processing Sanction..."
                  : "Sanction Loan and Disburse Funds"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
