import { useEffect, useState } from "react";
import type { LoanApplication } from "../../types/los";
import { formatINR, formatINRLakh } from "../../utils/formatters";
import { foirTone, PolicyRuler } from "../shared/PolicyRuler";
import { reducingEmi } from "./DecisionSummary";

interface CounterOfferSimProps {
  application: LoanApplication;
  onApplySimulatedOffer: (amount: number, tenure: number) => void;
}

const BASE_TENURES = [12, 24, 36, 48, 60];
const MIN_AMOUNT = 200000;
const STEP = 25000;

const TONE_PILL = {
  approve: { cls: "pill-approve", label: "Within policy" },
  review: { cls: "pill-review", label: "Review band" },
  decline: { cls: "pill-decline", label: "Above cap" },
} as const;

export function CounterOfferSim({
  application,
  onApplySimulatedOffer,
}: CounterOfferSimProps) {
  const metrics = application.metrics;
  const requested = application.loanRequest;
  const agentOffer = application.counterOffer;

  const initialAmount = agentOffer?.recommendedAmount || requested.amount;
  const initialTenure =
    agentOffer?.recommendedTenureMonths || requested.tenureMonths;

  const [simAmount, setSimAmount] = useState(initialAmount);
  const [simTenure, setSimTenure] = useState(initialTenure);
  const [applied, setApplied] = useState(false);

  // Reset when the selected file changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on file switch or new run
  useEffect(() => {
    setSimAmount(initialAmount);
    setSimTenure(initialTenure);
    setApplied(false);
  }, [application.id, application.updatedAt]);

  if (!metrics) {
    return (
      <section className="sheet" aria-label="Counter-offer">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 className="section-title">Counter-offer</h2>
        </div>
        <p className="border-t border-rule px-5 py-6 text-[13px] text-graphite sm:px-6">
          Terms can be restructured once verified income and existing EMIs are
          known.
        </p>
      </section>
    );
  }

  const income = metrics.verifiedMonthlyIncome;
  const existingEmi = metrics.existingEmiOutflow;
  const apr = metrics.annualInterestRatePct;

  const emi = reducingEmi(simAmount, apr, simTenure);
  const foir = income > 0 ? ((existingEmi + emi) / income) * 100 : 0;
  const tone = foirTone(foir);
  const savings = metrics.proposedEmi - emi;

  const maxAmount = Math.max(
    3000000,
    Math.ceil(requested.amount / STEP) * STEP,
  );
  const tenures = Array.from(
    new Set([...BASE_TENURES, requested.tenureMonths, simTenure]),
  ).sort((a, b) => a - b);

  const isAgentTerms =
    agentOffer !== undefined &&
    simAmount === agentOffer.recommendedAmount &&
    simTenure === agentOffer.recommendedTenureMonths;

  return (
    <section className="sheet" aria-label="Counter-offer">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3 sm:px-6">
        <h2 className="section-title">Counter-offer</h2>
        <p className="text-[12px] text-graphite">
          Reducing-balance EMI at <span className="num">{apr.toFixed(2)}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 border-t border-rule px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="sim-loan-amount" className="label">
                Loan amount
              </label>
              <span className="num text-[16px] font-semibold text-ink">
                {formatINR(simAmount)}
              </span>
            </div>
            <input
              id="sim-loan-amount"
              type="range"
              min={MIN_AMOUNT}
              max={maxAmount}
              step={STEP}
              value={simAmount}
              onChange={(e) => {
                setSimAmount(Number(e.target.value));
                setApplied(false);
              }}
              className="w-full cursor-pointer"
            />
            <div className="num mt-0.5 flex justify-between text-[11px] text-faint">
              <span>{formatINRLakh(MIN_AMOUNT)}</span>
              <span>Requested {formatINRLakh(requested.amount)}</span>
              <span>{formatINRLakh(maxAmount)}</span>
            </div>
          </div>

          <fieldset>
            <legend className="label">Tenure in months</legend>
            <div className="flex rounded-md bg-sunken p-0.5">
              {tenures.map((t) => {
                const active = simTenure === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSimTenure(t);
                      setApplied(false);
                    }}
                    className={`num flex-1 rounded-[5px] py-1.5 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-sheet text-ink shadow-[0_0_0_1px_var(--rule)]"
                        : "text-graphite hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {agentOffer && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-agent-tint px-3 py-2 text-[13px]">
              <span className="text-ink">
                Agent suggests{" "}
                <span className="num font-medium">
                  {formatINRLakh(agentOffer.recommendedAmount)}
                </span>{" "}
                over{" "}
                <span className="num">
                  {agentOffer.recommendedTenureMonths}
                </span>{" "}
                months
              </span>
              <button
                type="button"
                disabled={isAgentTerms}
                onClick={() => {
                  setSimAmount(agentOffer.recommendedAmount);
                  setSimTenure(agentOffer.recommendedTenureMonths);
                  setApplied(false);
                }}
                className="text-[12px] font-semibold text-agent hover:underline disabled:cursor-default disabled:text-graphite disabled:no-underline"
              >
                {isAgentTerms ? "Loaded" : "Load these terms"}
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[12px] text-graphite">New EMI</dt>
              <dd className="num text-[20px] font-semibold tracking-tight text-ink">
                {formatINR(emi)}
              </dd>
              <dd className="num text-[12px] text-faint">
                {savings > 0
                  ? `${formatINR(savings)} less than requested`
                  : savings < 0
                    ? `${formatINR(-savings)} more than requested`
                    : "Same as requested"}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-graphite">New FOIR</dt>
              <dd className="num text-[20px] font-semibold tracking-tight text-ink">
                {foir.toFixed(1)}%
              </dd>
              <dd>
                <span className={`pill ${TONE_PILL[tone].cls}`}>
                  {TONE_PILL[tone].label}
                </span>
              </dd>
            </div>
          </dl>

          <PolicyRuler
            compact
            requestedFoir={metrics.foirPercentage}
            counterFoir={foir}
          />

          <div className="flex items-center justify-end gap-3">
            {applied && (
              <span className="text-[12px] text-graphite" aria-live="polite">
                Terms added to the decision.
              </span>
            )}
            <button
              type="button"
              disabled={tone === "decline"}
              onClick={() => {
                onApplySimulatedOffer(simAmount, simTenure);
                setApplied(true);
              }}
              className="btn btn-secondary"
              title={
                tone === "decline"
                  ? "FOIR must be at or below 55% to offer"
                  : undefined
              }
            >
              Use these terms
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
