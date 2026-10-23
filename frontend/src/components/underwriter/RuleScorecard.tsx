import type { PolicyRuleResult, RuleOutcome } from "../../types/los";

const OUTCOME: Record<RuleOutcome, { label: string; tone: string }> = {
  AUTO_APPROVE: { label: "Passed", tone: "pill-approve" },
  MANUAL_REVIEW: { label: "Review", tone: "pill-review" },
  AUTO_REJECT: { label: "Failed", tone: "pill-decline" },
};

const RULE_NAMES: Record<string, string> = {
  applicant_age_years: "Applicant age",
  bureau_score: "Bureau score",
  foir_percentage: "FOIR",
  income_variance_pct: "Income variance",
  inward_bounces_6m: "Inward bounces in 6 months",
  dpd_delinquencies: "Past-due history, 24 months",
};

function ruleName(metric: string): string {
  if (RULE_NAMES[metric]) return RULE_NAMES[metric];
  const s = metric.replaceAll("_", " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface RuleScorecardProps {
  rules: PolicyRuleResult[];
}

export function RuleScorecard({ rules }: RuleScorecardProps) {
  const list = rules ?? [];
  const passed = list.filter((r) => r.outcome === "AUTO_APPROVE").length;
  const review = list.filter((r) => r.outcome === "MANUAL_REVIEW").length;
  const failed = list.filter((r) => r.outcome === "AUTO_REJECT").length;

  return (
    <section className="sheet" aria-label="Credit policy">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3 sm:px-6">
        <h2 className="section-title">Credit policy</h2>
        {list.length > 0 && (
          <p className="num text-[12px] text-graphite">
            {passed} passed, {review} review, {failed} failed
          </p>
        )}
      </div>

      {list.length === 0 ? (
        <p className="border-t border-rule px-5 py-6 text-[13px] text-graphite sm:px-6">
          Policy rules are evaluated once underwriting runs.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-rule">
          <table className="w-full min-w-[460px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-rule text-[12px] text-graphite">
                <th scope="col" className="py-2 pr-3 pl-5 font-medium sm:pl-6">
                  Rule
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Applicant
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Threshold
                </th>
                <th
                  scope="col"
                  className="py-2 pr-5 pl-3 text-right font-medium sm:pr-6"
                >
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((rule) => {
                const o = OUTCOME[rule.outcome] ?? OUTCOME.MANUAL_REVIEW;
                return (
                  <tr
                    key={rule.ruleId}
                    className={`border-b border-rule last:border-b-0 ${rule.outcome === "AUTO_REJECT" ? "bg-decline-tint/50" : ""}`}
                  >
                    <td className="py-2.5 pr-3 pl-5 sm:pl-6">
                      <span className="mr-2 whitespace-nowrap text-[11px] text-faint">
                        {rule.ruleId}
                      </span>
                      <span className="text-ink">
                        {ruleName(rule.metricName)}
                      </span>
                    </td>
                    <td className="num px-3 py-2.5 text-right font-medium text-ink">
                      {rule.actualValue}
                    </td>
                    <td className="num px-3 py-2.5 text-graphite">
                      {(() => {
                        // Backend sends "Auto-Approve: x | Review: y | Reject: z".
                        // Lead with the approve band; keep the rest secondary.
                        const parts = rule.thresholdDescription
                          .split("|")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const strip = (s: string) =>
                          s.replace(/^(Auto-Approve|Review|Reject):\s*/i, "");
                        if (parts.length < 2) return rule.thresholdDescription;
                        return (
                          <>
                            <div className="text-ink">{strip(parts[0])}</div>
                            <div className="text-[12px] text-faint">
                              Review {strip(parts[1])}
                              {parts[2] ? `, decline ${strip(parts[2])}` : ""}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 pr-5 pl-3 text-right sm:pr-6">
                      <span className={`pill ${o.tone}`}>{o.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
