import type { AdkAgentStepExecution } from "../../types/los";

type RowKind = "sequential" | "parallel" | "llm" | "a2a" | "tool" | "gate";

interface TraceRow {
  id: string;
  name: string;
  type: string;
  depth: number;
  start: number;
  duration: number;
  kind: RowKind;
  paused?: boolean;
  failed?: boolean;
}

const DEFAULTS = { parallel: 820, policy: 95, cam: 1450 };

/** Real timings below this are local deterministic stubs, not model calls. */
const PLAUSIBLE_MS = 5;

interface NormStep {
  agentName: string;
  status: string;
  toolCalls: string[];
  durationMs: number;
}

/** Steps may arrive camelCase (mock) or snake_case (backend). */
function normalizeSteps(steps: AdkAgentStepExecution[]): NormStep[] {
  return steps.map((s) => {
    const o = s as unknown as Record<string, unknown>;
    return {
      agentName: String(o.agentName ?? o.agent_name ?? ""),
      status: String(o.status ?? "COMPLETED"),
      toolCalls: (o.toolCalls ?? o.tool_calls ?? []) as string[],
      durationMs: Number(o.durationMs ?? o.duration_ms ?? 0),
    };
  });
}

function findStep(steps: NormStep[], name: string) {
  return steps.find((s) => s.agentName === name);
}

function buildRows(
  steps: NormStep[],
  a2aLatencyMs: number,
  hitlPaused?: boolean,
): { rows: TraceRow[]; total: number; illustrative: boolean } {
  const par = findStep(steps, "parallel_verification_stage");
  const pol = findStep(steps, "deterministic_policy_agent");
  const cam = findStep(steps, "cam_synthesizer_agent");

  const real = [par, pol, cam].every(
    (s) => s !== undefined && s.durationMs >= PLAUSIBLE_MS,
  );
  const illustrative = !real;

  const parMs = real ? Math.round(par?.durationMs ?? 0) : DEFAULTS.parallel;
  const polMs = real ? Math.round(pol?.durationMs ?? 0) : DEFAULTS.policy;
  const camMs = real ? Math.round(cam?.durationMs ?? 0) : DEFAULTS.cam;
  const total = parMs + polMs + camMs;

  // Child spans of the parallel stage: real if plausible, else proportional.
  const child = (name: string, ratio: number) => {
    const s = findStep(steps, name);
    return real && s && s.durationMs >= PLAUSIBLE_MS
      ? Math.min(Math.round(s.durationMs), parMs)
      : Math.round(parMs * ratio);
  };

  const bureauStart = Math.round(parMs * 0.06);
  const bureauMs = real
    ? child("credit_bureau_a2a_bridge", 0.3)
    : Math.min(
        Math.max(a2aLatencyMs >= PLAUSIBLE_MS ? a2aLatencyMs : 210, 40),
        parMs - bureauStart,
      );

  const polStart = parMs;
  const camStart = parMs + polMs;
  const paused = hitlPaused ?? steps.some((s) => s.status === "PAUSED_HITL");

  const rows: TraceRow[] = [
    {
      id: "root",
      name: "los_orchestrator_agent",
      type: "SequentialAgent",
      depth: 0,
      start: 0,
      duration: total,
      kind: "sequential",
    },
    {
      id: "par",
      name: "parallel_verification_stage",
      type: "ParallelAgent",
      depth: 1,
      start: 0,
      duration: parMs,
      kind: "parallel",
      failed: par?.status === "FAILED",
    },
    {
      id: "kyc",
      name: "kyc_fraud_agent",
      type: "LlmAgent",
      depth: 2,
      start: Math.round(parMs * 0.02),
      duration: child("kyc_fraud_agent", 0.52),
      kind: "llm",
    },
    {
      id: "spread",
      name: "financial_spreading_agent",
      type: "LlmAgent",
      depth: 2,
      start: Math.round(parMs * 0.03),
      duration: child("financial_spreading_agent", 0.95),
      kind: "llm",
    },
    {
      id: "bureau",
      name: "credit_bureau_a2a_bridge",
      type: "RemoteA2aAgent",
      depth: 2,
      start: bureauStart,
      duration: bureauMs,
      kind: "a2a",
    },
    {
      id: "pol",
      name: "deterministic_policy_agent",
      type: "LlmAgent",
      depth: 1,
      start: polStart,
      duration: polMs,
      kind: "llm",
      failed: pol?.status === "FAILED",
    },
    {
      id: "ratios",
      name: "compute_financial_ratios_tool",
      type: "Tool",
      depth: 2,
      start: polStart + Math.round(polMs * 0.05),
      duration: Math.max(Math.round(polMs * 0.38), 1),
      kind: "tool",
    },
    {
      id: "policy",
      name: "evaluate_credit_policy_tool",
      type: "Tool",
      depth: 2,
      start: polStart + Math.round(polMs * 0.48),
      duration: Math.max(Math.round(polMs * 0.47), 1),
      kind: "tool",
    },
    {
      id: "cam",
      name: "cam_synthesizer_agent",
      type: "LlmAgent",
      depth: 1,
      start: camStart,
      duration: camMs,
      kind: "llm",
      failed: cam?.status === "FAILED",
    },
    {
      id: "synth",
      name: cam?.toolCalls?.[0] ?? "synthesize_cam_and_offer_tool",
      type: "Tool",
      depth: 2,
      start: camStart + Math.round(camMs * 0.03),
      duration: Math.round(camMs * 0.9),
      kind: "tool",
    },
    {
      id: "gate",
      name: "human_review_gate",
      type: paused ? "Waiting for underwriter" : "Not required",
      depth: 2,
      start: total - Math.max(Math.round(total * 0.012), 1),
      duration: Math.max(Math.round(total * 0.012), 1),
      kind: "gate",
      paused,
    },
  ];

  return { rows, total, illustrative };
}

function axisTicks(total: number): number[] {
  const step = total > 2400 ? 1000 : total > 1200 ? 500 : 250;
  const ticks: number[] = [];
  for (let t = 0; t <= total; t += step) ticks.push(t);
  return ticks;
}

const BAR_CLASS: Record<RowKind, string> = {
  sequential: "bg-ink/80",
  parallel: "bg-graphite/70",
  llm: "bg-agent/55",
  a2a: "bg-agent",
  tool: "bg-agent/25",
  gate: "bg-review",
};

interface AgentTraceProps {
  steps: AdkAgentStepExecution[];
  a2aLatencyMs: number;
  runKey: string;
  /** Optional override; pass `status === "MANUAL_REVIEW"` when available. */
  hitlPaused?: boolean;
}

export function AgentTrace({
  steps,
  a2aLatencyMs,
  runKey,
  hitlPaused,
}: AgentTraceProps) {
  const safeSteps = steps ?? [];

  const heading = (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3 sm:px-6">
      <div>
        <h2 className="section-title">Agent trace</h2>
        <p className="text-[12px] text-graphite">
          Google ADK, model gemini-3.8-flash
        </p>
      </div>
    </div>
  );

  if (safeSteps.length === 0) {
    return (
      <section className="sheet" aria-label="Agent trace">
        {heading}
        <p className="border-t border-rule px-5 py-6 text-[13px] text-graphite sm:px-6">
          No agent run yet. The trace appears once underwriting completes.
        </p>
      </section>
    );
  }

  const { rows, total, illustrative } = buildRows(
    normalizeSteps(safeSteps),
    a2aLatencyMs,
    hitlPaused,
  );
  const ticks = axisTicks(total);
  const pct = (ms: number) => `${(ms / total) * 100}%`;

  return (
    <section className="sheet" aria-label="Agent trace">
      {heading}
      <div className="overflow-x-auto border-t border-rule">
        <div className="min-w-[680px]">
          {/* Axis */}
          <div className="grid grid-cols-[272px_minmax(0,1fr)_76px] border-b border-rule text-[11px] text-faint">
            <div className="px-5 py-1.5 sm:px-6">Span</div>
            <div className="relative">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="num absolute top-1.5 -translate-x-1/2 first:translate-x-0"
                  style={{ left: pct(t) }}
                >
                  {t === 0 ? "0" : `${t} ms`}
                </span>
              ))}
            </div>
            <div className="px-3 py-1.5 text-right">Duration</div>
          </div>

          <ol>
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[272px_minmax(0,1fr)_76px] items-center border-b border-rule last:border-b-0"
              >
                <div
                  className="min-w-0 py-2 pr-2"
                  style={{ paddingLeft: `${20 + row.depth * 14}px` }}
                >
                  <div
                    className={`truncate font-mono text-[12px] ${row.kind === "tool" || row.kind === "gate" ? "text-graphite" : "text-ink"}`}
                  >
                    {row.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-graphite">
                    <span>{row.type}</span>
                    {row.kind === "a2a" && (
                      <span className="pill pill-agent px-1.5 py-0 text-[10px] leading-4">
                        A2A
                      </span>
                    )}
                    {row.failed && (
                      <span className="pill pill-decline px-1.5 py-0 text-[10px] leading-4">
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative h-full min-h-10">
                  {ticks.map((t) => (
                    <span
                      key={t}
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-rule/60"
                      style={{ left: pct(t) }}
                    />
                  ))}
                  {row.kind === "gate" ? (
                    <span
                      className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${row.paused ? "bg-review" : "border border-rule-strong bg-sheet"}`}
                      style={{ left: `calc(${pct(row.start)} + 6px)` }}
                      title={row.paused ? "Paused for human review" : "Skipped"}
                    />
                  ) : (
                    <span
                      key={runKey}
                      className={`trace-bar absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px] ${row.failed ? "bg-decline" : BAR_CLASS[row.kind]}`}
                      style={{
                        left: pct(row.start),
                        width: `max(${pct(row.duration)}, 3px)`,
                        animationDelay: `${Math.round((row.start / total) * 400)}ms`,
                      }}
                    />
                  )}
                </div>

                <div
                  className={`num whitespace-nowrap px-3 text-right text-[12px] ${row.kind === "gate" && row.paused ? "font-medium text-review" : "text-graphite"}`}
                >
                  {row.kind === "gate"
                    ? row.paused
                      ? "Paused"
                      : "—"
                    : `${row.duration} ms`}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {illustrative && (
        <p className="border-t border-rule px-5 py-2.5 text-[12px] text-faint sm:px-6">
          Timings are illustrative. This run used local deterministic tools, so
          measured spans were under a millisecond.
        </p>
      )}
    </section>
  );
}
