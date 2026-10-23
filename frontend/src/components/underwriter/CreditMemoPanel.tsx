import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Copy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { CreditAssessmentMemo } from "../../types/los";

interface CreditMemoPanelProps {
  cam?: CreditAssessmentMemo;
  applicantName: string;
}

export function CreditMemoPanel({ cam, applicantName }: CreditMemoPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!cam) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-center text-xs text-[var(--text-faint)]">
        Credit Assessment Memo will be synthesized once the ADK agent completes
        evaluation.
      </div>
    );
  }

  const handleCopy = () => {
    const text = `CREDIT ASSESSMENT MEMO (CAM) - ${applicantName}
Executive Summary:
${cam.executiveSummary}

Key Strengths:
${cam.strengths.map((s) => `• ${s}`).join("\n")}

Risk Flags:
${cam.riskFlags.map((r) => `• ${r}`).join("\n")}

Mitigants:
${cam.mitigants.map((m) => `• ${m}`).join("\n")}

Recommendation:
${cam.recommendationJustification}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            AI Credit Assessment Memo (CAM)
          </h3>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
            Synthesized by cam_synthesizer_agent (Gemini 2.5 Flash)
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]"
        >
          {copied ? (
            <>
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <span>Copied CAM</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Memo</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Executive Summary */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3">
          <div className="mb-1 font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Executive Summary
          </div>
          <p className="leading-relaxed text-[var(--text-primary)]">
            {cam.executiveSummary}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Strengths */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-xs text-emerald-900 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Underwriting Strengths (5 Cs)</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-[var(--text-primary)]">
              {cam.strengths.map((str) => (
                <li key={str} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    •
                  </span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Flags & Mitigants */}
          <div className="space-y-3">
            {cam.riskFlags.length > 0 && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 font-semibold text-xs text-rose-900 dark:text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Identified Risk Flags</span>
                </div>
                <ul className="space-y-1 text-[11px] text-[var(--text-primary)]">
                  {cam.riskFlags.map((risk) => (
                    <li key={risk} className="flex items-start gap-1.5">
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        •
                      </span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {cam.mitigants.length > 0 && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="mb-1 font-semibold text-xs text-blue-900 dark:text-blue-300">
                  Compensating Factors & Mitigants
                </div>
                <ul className="space-y-1 text-[11px] text-[var(--text-primary)]">
                  {cam.mitigants.map((mit) => (
                    <li key={mit} className="flex items-start gap-1.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        •
                      </span>
                      <span>{mit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Recommendation Justification */}
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-xs text-indigo-900 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Senior Underwriting Recommendation & Justification</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-primary)]">
            {cam.recommendationJustification}
          </p>
        </div>
      </div>
    </div>
  );
}
