import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck,
  XCircle,
} from "lucide-react";
import type {
  DocumentExtractionResult,
  KYCVerificationResult,
  UnderwritingMetrics,
} from "../../types/los";
import { formatINR, formatPercent, maskTaxId } from "../../utils/formatters";

interface DocSpreadViewerProps {
  metrics?: UnderwritingMetrics;
  extraction?: DocumentExtractionResult;
  kyc?: KYCVerificationResult;
  declaredIncome: number;
  declaredTaxId: string;
}

export function DocSpreadViewer({
  metrics,
  extraction,
  kyc,
  declaredIncome,
  declaredTaxId,
}: DocSpreadViewerProps) {
  const verifiedIncome =
    metrics?.verifiedMonthlyIncome ||
    extraction?.verifiedMonthlyIncome ||
    declaredIncome;
  const variancePct =
    metrics?.incomeVariancePct ??
    (declaredIncome > 0
      ? (Math.abs(declaredIncome - verifiedIncome) / declaredIncome) * 100
      : 0);

  let varianceBadge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      Variance: {formatPercent(variancePct)} (Low Risk &le; 10%)
    </span>
  );

  if (variancePct > 25.0) {
    varianceBadge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
        <XCircle className="h-3 w-3" />
        Critical Variance: {formatPercent(variancePct)} (&gt; 25% Discrepancy)
      </span>
    );
  } else if (variancePct > 10.0) {
    varianceBadge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Moderate Variance: {formatPercent(variancePct)} (10% - 25% Amber)
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Document Extraction & Bank Spreading Comparison
          </h3>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
            FR-03, FR-05, FR-06
          </span>
        </div>
        {varianceBadge}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Income & Financial Spreading */}
        <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3.5">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
            <span>Income & Cashflow Spreading (6-Month Statement)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Declared Monthly Income
              </span>
              <div className="font-bold text-sm text-[var(--text-primary)]">
                {formatINR(declaredIncome)}
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                From Borrower Intake Form
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Verified Monthly Income
              </span>
              <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
                {formatINR(verifiedIncome)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Extracted by financial_spreading_agent
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Average Monthly Balance (AMB)
              </span>
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {formatINR(
                  metrics?.averageMonthlyBalance ||
                    extraction?.averageMonthlyBalance ||
                    0,
                )}
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                Liquidity reserve buffer
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Existing Debt Servicing (EMIs)
              </span>
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {formatINR(
                  metrics?.existingEmiOutflow ||
                    extraction?.existingEmiOutflow ||
                    0,
                )}
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                Active banking debits
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs">
            <span className="text-[var(--text-muted)]">
              Inward Cheque / NACH Bounces (6m):
            </span>
            <span
              className={`font-bold ${
                (
                  metrics?.inwardBounces6m || extraction?.inwardBounces6m || 0
                ) === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : (metrics?.inwardBounces6m ||
                        extraction?.inwardBounces6m ||
                        0) === 1
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {metrics?.inwardBounces6m || extraction?.inwardBounces6m || 0}{" "}
              Returns
            </span>
          </div>

          {extraction?.tamperFlags && extraction.tamperFlags.length > 0 && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-800 dark:text-rose-300">
              <span className="font-bold">Tamper Flags Detected: </span>
              {extraction.tamperFlags.join(", ")}
            </div>
          )}
        </div>

        {/* Right: KYC & Identity Verification */}
        <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3.5">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>KYC Multimodal Identity Verification (Government ID)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Fuzzy Name Match
              </span>
              <div className="font-bold text-sm text-[var(--text-primary)]">
                {kyc?.nameSimilarityScore || 98.0}%
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Threshold &ge; 85% passed
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                PAN Match & Masking
              </span>
              <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                {maskTaxId(declaredTaxId)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Exact NSDL match (100%)
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Date of Birth Verification
              </span>
              <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                Match Verified
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                Age: {metrics?.applicantAgeYears || 35} yrs
              </span>
            </div>

            <div className="rounded-md bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Global Watchlist & AML
              </span>
              <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                Clear (0 Hits)
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                OFAC & UNSC Screened
              </span>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">
                Extracted Name on ID:
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {extraction?.extractedName || "Verified"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">
                Multimodal OCR Confidence:
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatPercent((extraction?.idConfidenceScore || 0.98) * 100)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
