import { Check, X } from "lucide-react";
import type {
  DocumentExtractionResult,
  KYCVerificationResult,
  UnderwritingMetrics,
} from "../../types/los";
import { formatINR, maskTaxId } from "../../utils/formatters";

interface DocSpreadViewerProps {
  metrics?: UnderwritingMetrics;
  extraction?: DocumentExtractionResult;
  kyc?: KYCVerificationResult;
  declaredIncome: number;
  declaredTaxId: string;
}

function CheckRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[13px] text-ink">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-approve-tint text-approve" : "bg-decline-tint text-decline"}`}
        >
          {ok ? (
            <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
          ) : (
            <X aria-hidden className="h-3 w-3" strokeWidth={3} />
          )}
        </span>
        {label}
        <span className="sr-only">{ok ? "passed" : "failed"}</span>
      </span>
      <span
        className={`num text-[12px] ${ok ? "text-graphite" : "font-medium text-decline"}`}
      >
        {detail}
      </span>
    </li>
  );
}

type Loose = Record<string, unknown>;

/** Read a field that may arrive camelCase (mock) or snake_case (backend). */
function pick<T>(obj: Loose, camel: string, snake: string, fallback: T): T {
  const v = obj[camel] ?? obj[snake];
  return (v ?? fallback) as T;
}

function normalizeExtraction(
  raw?: DocumentExtractionResult,
): DocumentExtractionResult | undefined {
  if (!raw) return undefined;
  const o = raw as unknown as Loose;
  return {
    extractedName: pick(o, "extractedName", "extracted_name", ""),
    extractedDob: pick(o, "extractedDob", "extracted_dob", ""),
    extractedTaxId: pick(o, "extractedTaxId", "extracted_tax_id", ""),
    idConfidenceScore: pick(o, "idConfidenceScore", "id_confidence_score", 0),
    averageMonthlyBalance: pick(
      o,
      "averageMonthlyBalance",
      "average_monthly_balance",
      0,
    ),
    verifiedMonthlyIncome: pick(
      o,
      "verifiedMonthlyIncome",
      "verified_monthly_income",
      0,
    ),
    existingEmiOutflow: pick(
      o,
      "existingEmiOutflow",
      "existing_emi_outflow",
      0,
    ),
    inwardBounces6m: pick(o, "inwardBounces6m", "inward_bounces_6m", 0),
    tamperFlags: pick<string[]>(o, "tamperFlags", "tamper_flags", []),
  };
}

function normalizeKyc(
  raw?: KYCVerificationResult,
): KYCVerificationResult | undefined {
  if (!raw) return undefined;
  const o = raw as unknown as Loose;
  return {
    nameSimilarityScore: pick(
      o,
      "nameSimilarityScore",
      "name_similarity_score",
      0,
    ),
    dobMatch: pick(o, "dobMatch", "dob_match", false),
    taxIdMatch: pick(o, "taxIdMatch", "tax_id_match", false),
    watchlistHit: pick(o, "watchlistHit", "watchlist_hit", false),
    isExistingCustomerDelinquent: pick(
      o,
      "isExistingCustomerDelinquent",
      "is_existing_customer_delinquent",
      false,
    ),
    kycPassed: pick(o, "kycPassed", "kyc_passed", false),
    failureReasons: pick<string[]>(o, "failureReasons", "failure_reasons", []),
  };
}

export function DocSpreadViewer({
  metrics,
  extraction: rawExtraction,
  kyc: rawKyc,
  declaredIncome,
  declaredTaxId,
}: DocSpreadViewerProps) {
  const extraction = normalizeExtraction(rawExtraction);
  const kyc = normalizeKyc(rawKyc);
  const verified =
    metrics?.verifiedMonthlyIncome ?? extraction?.verifiedMonthlyIncome;
  const variance =
    metrics?.incomeVariancePct ??
    (verified !== undefined && declaredIncome > 0
      ? ((verified - declaredIncome) / declaredIncome) * 100
      : undefined);
  const absVar = Math.abs(variance ?? 0);
  const varTone =
    absVar <= 10
      ? "pill-approve"
      : absVar <= 25
        ? "pill-review"
        : "pill-decline";

  const amb =
    metrics?.averageMonthlyBalance ?? extraction?.averageMonthlyBalance;
  const emi = metrics?.existingEmiOutflow ?? extraction?.existingEmiOutflow;
  const bounces = metrics?.inwardBounces6m ?? extraction?.inwardBounces6m;
  const tamper = extraction?.tamperFlags ?? [];
  const reasons = kyc?.failureReasons ?? [];

  const hasData = Boolean(metrics || extraction || kyc);

  return (
    <section className="sheet" aria-label="Income and documents">
      <div className="px-5 pt-5 pb-3 sm:px-6">
        <h2 className="section-title">Income and documents</h2>
      </div>

      {!hasData ? (
        <p className="border-t border-rule px-5 py-6 text-[13px] text-graphite sm:px-6">
          Documents are spread and verified once underwriting runs.
        </p>
      ) : (
        <>
          {/* Declared vs verified */}
          <div className="grid grid-cols-2 border-t border-rule">
            <div className="px-5 py-4 sm:px-6">
              <div className="text-[12px] text-graphite">Declared income</div>
              <div className="num mt-0.5 text-[20px] font-semibold tracking-tight text-graphite">
                {formatINR(declaredIncome)}
              </div>
              <div className="text-[12px] text-faint">
                per month, by borrower
              </div>
            </div>
            <div className="border-l border-rule px-5 py-4 sm:px-6">
              <div className="text-[12px] text-graphite">Verified income</div>
              <div className="num mt-0.5 text-[20px] font-semibold tracking-tight text-ink">
                {verified !== undefined ? formatINR(verified) : "—"}
              </div>
              {variance !== undefined && (
                <span className={`pill mt-1 ${varTone}`}>
                  <span className="num">{absVar.toFixed(1)}%</span> variance
                </span>
              )}
            </div>
          </div>

          {/* Bank statement spread */}
          <dl className="grid grid-cols-3 border-t border-rule text-[13px]">
            <div className="px-5 py-3 sm:px-6">
              <dt className="text-[12px] text-graphite">Average balance</dt>
              <dd className="num font-medium text-ink">
                {amb !== undefined ? formatINR(amb) : "—"}
              </dd>
            </div>
            <div className="border-l border-rule px-4 py-3">
              <dt className="text-[12px] text-graphite">Existing EMIs</dt>
              <dd className="num font-medium text-ink">
                {emi !== undefined ? formatINR(emi) : "—"}
              </dd>
            </div>
            <div className="border-l border-rule px-4 py-3">
              <dt className="text-[12px] text-graphite">Bounces, 6 months</dt>
              <dd
                className={`num font-medium ${bounces && bounces > 0 ? "text-decline" : "text-ink"}`}
              >
                {bounces ?? "—"}
              </dd>
            </div>
          </dl>

          {/* KYC */}
          {kyc && (
            <div className="border-t border-rule px-5 pt-3 pb-2 sm:px-6">
              <h3 className="text-[13px] font-semibold text-ink">KYC</h3>
              <ul className="divide-y divide-rule">
                <CheckRow
                  ok={kyc.nameSimilarityScore >= 85}
                  label="Name matches PAN"
                  detail={`${kyc.nameSimilarityScore.toFixed(0)}% similar`}
                />
                <CheckRow
                  ok={kyc.dobMatch}
                  label="Date of birth"
                  detail={kyc.dobMatch ? "Matches" : "Mismatch"}
                />
                <CheckRow
                  ok={kyc.taxIdMatch}
                  label="PAN"
                  detail={
                    kyc.taxIdMatch
                      ? maskTaxId(declaredTaxId)
                      : `Declared ${maskTaxId(declaredTaxId)}, found ${maskTaxId(extraction?.extractedTaxId ?? "")}`
                  }
                />
                <CheckRow
                  ok={!kyc.watchlistHit}
                  label="Watchlist screening"
                  detail={kyc.watchlistHit ? "Hit" : "Clear"}
                />
              </ul>
              {reasons.length > 0 && (
                <ul className="mt-1 mb-2 space-y-1">
                  {reasons.map((r) => (
                    <li key={r} className="text-[12px] text-decline">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tamper flags */}
          {tamper.length > 0 && (
            <div className="border-t border-rule">
              <h3 className="px-5 pt-3 pb-2 text-[13px] font-semibold text-decline sm:px-6">
                Document tamper flags
              </h3>
              <ul>
                {tamper.map((flag) => (
                  <li
                    key={flag}
                    className="border-t border-rule bg-decline-tint px-5 py-2 text-[13px] text-decline first:border-t-0 sm:px-6"
                  >
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
