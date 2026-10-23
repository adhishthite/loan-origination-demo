import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { CreditAssessmentMemo } from "../../types/los";

interface CreditMemoPanelProps {
  cam?: CreditAssessmentMemo;
  applicantName: string;
}

function MemoList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-sans text-[13px] font-semibold text-ink">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-faint">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function CreditMemoPanel({ cam, applicantName }: CreditMemoPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!cam) {
    return (
      <section className="sheet" aria-label="Credit assessment memo">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 className="section-title">Credit assessment memo</h2>
        </div>
        <p className="border-t border-rule px-5 py-6 text-[13px] text-graphite sm:px-6">
          The memo is drafted by the agent after policy evaluation completes.
        </p>
      </section>
    );
  }

  const strengths = cam.strengths ?? [];
  const risks = cam.riskFlags ?? [];
  const mitigants = cam.mitigants ?? [];

  const handleCopy = async () => {
    const section = (t: string, xs: string[]) =>
      xs.length ? `\n${t}\n${xs.map((x) => `- ${x}`).join("\n")}\n` : "";
    const text = `Credit assessment memo: ${applicantName}

${cam.executiveSummary}
${section("Strengths", strengths)}${section("Risks", risks)}${section("Mitigants", mitigants)}
Recommendation
${cam.recommendationJustification}
`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <section className="sheet" aria-label="Credit assessment memo">
      <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-5 pb-3 sm:px-6">
        <div>
          <h2 className="section-title">Credit assessment memo</h2>
          <p className="text-[12px] text-graphite">
            Drafted by <span className="font-mono">cam_synthesizer_agent</span>{" "}
            with gemini-3.8-flash
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost -mr-2 px-2.5 py-1.5"
        >
          {copied ? (
            <Check aria-hidden className="h-4 w-4 text-approve" />
          ) : (
            <Copy aria-hidden className="h-4 w-4" />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy memo"}</span>
        </button>
      </div>

      <div className="border-t border-rule">
        <article className="max-w-[72ch] space-y-5 px-5 py-5 font-serif text-[15px] leading-[1.65] text-ink sm:px-6">
          <p>{cam.executiveSummary}</p>
          <MemoList title="Strengths" items={strengths} />
          <MemoList title="Risks" items={risks} />
          <MemoList title="Mitigants" items={mitigants} />
          <div>
            <h3 className="font-sans text-[13px] font-semibold text-ink">
              Recommendation
            </h3>
            <p className="mt-1">{cam.recommendationJustification}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
