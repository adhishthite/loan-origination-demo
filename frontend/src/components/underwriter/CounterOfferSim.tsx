import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { LoanApplication } from "../../types/los";
import { formatINR, formatPercent } from "../../utils/formatters";

interface CounterOfferSimProps {
  application: LoanApplication;
  onApplySimulatedOffer: (amount: number, tenure: number) => void;
}

export function CounterOfferSim({
  application,
  onApplySimulatedOffer,
}: CounterOfferSimProps) {
  const initialAmount =
    application.counterOffer?.recommendedAmount ||
    application.loanRequest.amount;
  const initialTenure =
    application.counterOffer?.recommendedTenureMonths ||
    application.loanRequest.tenureMonths;

  const [simAmount, setSimAmount] = useState(initialAmount);
  const [simTenure, setSimTenure] = useState(initialTenure);

  // Sync state if application changes
  useEffect(() => {
    setSimAmount(
      application.counterOffer?.recommendedAmount ||
        application.loanRequest.amount,
    );
    setSimTenure(
      application.counterOffer?.recommendedTenureMonths ||
        application.loanRequest.tenureMonths,
    );
  }, [application]);

  // Financial calculations
  const verifiedIncome = application.metrics?.verifiedMonthlyIncome || 115000;
  const existingEmi = application.metrics?.existingEmiOutflow || 18000;
  const apr = application.metrics?.annualInterestRatePct || 13.5;

  const monthlyRate = apr / (12 * 100);
  const n = simTenure;
  const p = simAmount;
  const emi =
    (p * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
  const foir = ((existingEmi + emi) / verifiedIncome) * 100;

  const isViable = foir <= 55.0;
  const isOptimal = foir <= 48.0;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Interactive Counter-Offer & Debt Restructuring Simulator
          </h3>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
            FR-08 / FR-11
          </span>
        </div>
        <span className="text-xs text-[var(--text-faint)]">
          Live Reducing EMI & FOIR Recalculation
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="sim-loan-amount"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Simulated Principal Amount
              </label>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                {formatINR(simAmount)}
              </span>
            </div>
            <input
              id="sim-loan-amount"
              type="range"
              min={200000}
              max={3000000}
              step={25000}
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--bg-muted)] accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-faint)]">
              <span>₹2L</span>
              <span>₹15L</span>
              <span>₹30L</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Simulated Tenure (Months)
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[12, 24, 36, 48, 60].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSimTenure(t)}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    simTenure === t
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>

          {/* Quick AI Presets */}
          {application.counterOffer && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 text-[11px] text-amber-900 dark:text-amber-200">
                AI Optimal:{" "}
                {formatINR(application.counterOffer.recommendedAmount)} @{" "}
                {application.counterOffer.recommendedTenureMonths}m
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimAmount(
                    application.counterOffer?.recommendedAmount || simAmount,
                  );
                  setSimTenure(
                    application.counterOffer?.recommendedTenureMonths ||
                      simTenure,
                  );
                }}
                className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-amber-600"
              >
                Apply AI Terms
              </button>
            </div>
          )}
        </div>

        {/* Live Gauges & Comparison */}
        <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Projected Monthly EMI
              </span>
              <div className="font-bold text-base text-blue-600 dark:text-blue-400">
                {formatINR(Math.round(emi))}
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                @ {apr}% reducing APR
              </span>
            </div>

            <div className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-faint)]">
                Resulting FOIR %
              </span>
              <div
                className={`font-bold text-base ${
                  isOptimal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isViable
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatPercent(foir)}
              </div>
              <span className="text-[10px] text-[var(--text-faint)]">
                {isOptimal
                  ? "Optimal (< 48%)"
                  : isViable
                    ? "Prudential (< 55%)"
                    : "Over-leveraged"}
              </span>
            </div>
          </div>

          {/* Visual FOIR Bar */}
          <div>
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">
                Policy FOIR Scale
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatPercent(foir)}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--bg-card)] ring-1 ring-[var(--border-subtle)]">
              <div
                className={`h-full transition-all duration-300 ${
                  isOptimal
                    ? "bg-emerald-500"
                    : isViable
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, foir)}%` }}
              />
              {/* 45% policy line */}
              <div className="absolute top-0 bottom-0 left-[45%] w-0.5 bg-slate-400/60" />
              {/* 55% policy cap */}
              <div className="absolute top-0 bottom-0 left-[55%] w-0.5 bg-rose-500" />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-[var(--text-faint)]">
              <span>0%</span>
              <span className="text-emerald-600">45% Auto-Approve</span>
              <span className="text-rose-600">55% Hard Cap</span>
              <span>100%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onApplySimulatedOffer(simAmount, simTenure)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <span>Apply Terms to Decision Gate</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
