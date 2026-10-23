import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  Network,
  Scale,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { AdkAgentStepExecution } from "../../types/los";

interface AdkPipelineGraphProps {
  steps: AdkAgentStepExecution[];
  a2aLatencyMs?: number;
}

export function AdkPipelineGraph({
  steps,
  a2aLatencyMs = 210,
}: AdkPipelineGraphProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            COMPLETED
          </span>
        );
      case "PAUSED_HITL":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-2.5 w-2.5" />
            PAUSED (HITL)
          </span>
        );
      case "RUNNING":
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-400">
            <Activity className="h-2.5 w-2.5 animate-spin" />
            RUNNING
          </span>
        );
      default:
        return (
          <span className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-[9px] text-[var(--text-faint)]">
            PENDING
          </span>
        );
    }
  };

  const parallelStep = steps.find(
    (s) => s.agentName === "parallel_verification_stage",
  );
  const policyStep = steps.find(
    (s) => s.agentName === "deterministic_policy_agent",
  );
  const camStep = steps.find((s) => s.agentName === "cam_synthesizer_agent");

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            ADK Multi-Agent & A2A Pipeline Topology
          </h3>
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
            TRD-ADK-01 / TRD-A2A-01
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-faint)]">
          <span>
            Orchestrator:{" "}
            <span className="font-mono text-blue-600 dark:text-blue-400">
              SequentialAgent
            </span>
          </span>
          <span>•</span>
          <span>
            A2A Latency:{" "}
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {a2aLatencyMs}ms
            </span>
          </span>
        </div>
      </div>

      {/* Visual Execution Flow */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Stage 1: Parallel Verification Stage */}
        <div className="relative rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">
                1
              </span>
              <div>
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  ParallelAgent Stage
                </span>
                <div className="font-mono text-[9px] text-[var(--text-faint)]">
                  parallel_verification_stage
                </div>
              </div>
            </div>
            {getStatusBadge(parallelStep?.status || "COMPLETED")}
          </div>

          <div className="mt-2 space-y-2">
            {/* Branch A: KYC */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  kyc_fraud_agent
                </span>
                <span className="font-mono text-[9px] text-[var(--text-faint)]">
                  gemini-2.5-flash
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                Multimodal ID extract, fuzzy name match & dedupe
              </p>
            </div>

            {/* Branch B: Statement Spreading */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <Database className="h-3 w-3 text-blue-600" />
                  financial_spreading_agent
                </span>
                <span className="font-mono text-[9px] text-[var(--text-faint)]">
                  gemini-2.5-flash
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                6M AMB, EMI cash outflows & income variance
              </p>
            </div>

            {/* Branch C: A2A Bureau Bridge */}
            <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                  <Network className="h-3 w-3 text-purple-600" />
                  bureau_a2a_bridge
                </span>
                <span className="rounded bg-purple-500/20 px-1 font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300">
                  RemoteA2aAgent
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-purple-800 dark:text-purple-300">
                Federated A2A JSON-RPC pull to CIC Bureau
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-1.5 font-mono text-[9px] text-[var(--text-faint)]">
            <span>Duration: {parallelStep?.durationMs || 820}ms</span>
            <span>Writes: session.state[3 keys]</span>
          </div>
        </div>

        {/* Stage 2: Deterministic Policy Agent */}
        <div className="relative rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
                2
              </span>
              <div>
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  Deterministic Policy Stage
                </span>
                <div className="font-mono text-[9px] text-[var(--text-faint)]">
                  deterministic_policy_agent
                </div>
              </div>
            </div>
            {getStatusBadge(policyStep?.status || "COMPLETED")}
          </div>

          <div className="mt-2 space-y-2">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <Scale className="h-3 w-3 text-indigo-600" />
                  compute_financial_ratios_tool
                </span>
                <span className="font-mono text-[9px] text-emerald-600">
                  Pure Python
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                Reducing EMI, FOIR %, APR tier pricing, Counter-Offer
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <Terminal className="h-3 w-3 text-indigo-600" />
                  evaluate_credit_policy_tool
                </span>
                <span className="font-mono text-[9px] text-emerald-600">
                  Deterministic
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                POL-01..06 rules, boundary caps, adverse action codes
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-2 text-[10px] text-[var(--text-faint)]">
              🛡️ TRD-NFR-01: Zero LLM hallucinations in arithmetic; all state
              validated in Python FunctionTools.
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-1.5 font-mono text-[9px] text-[var(--text-faint)]">
            <span>Duration: {policyStep?.durationMs || 95}ms</span>
            <span>Writes: session.state[routing]</span>
          </div>
        </div>

        {/* Stage 3: CAM Synthesizer Agent & HITL Gate */}
        <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-bold text-white">
                3
              </span>
              <div>
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  CAM & HITL Gate Stage
                </span>
                <div className="font-mono text-[9px] text-[var(--text-faint)]">
                  cam_synthesizer_agent
                </div>
              </div>
            </div>
            {getStatusBadge(camStep?.status || "COMPLETED")}
          </div>

          <div className="mt-2 space-y-2">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <Bot className="h-3 w-3 text-emerald-600" />
                  synthesize_cam_and_offer_tool
                </span>
                <span className="font-mono text-[9px] text-[var(--text-faint)]">
                  gemini-2.5-flash
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                Structured Credit Assessment Memo (5 Cs), KFS generation
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)]">
                  <Layers className="h-3 w-3 text-amber-500" />
                  HITL Resumability Gate
                </span>
                <span className="font-mono text-[9px] text-amber-600">
                  ResumabilityConfig
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                Pauses execution on Grey-Zone loans for Underwriter decision
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-2 text-[10px] text-[var(--text-faint)]">
              📋 TRD-NFR-02: ADK callbacks write immutable audit trail to
              session.state[&apos;audit_log&apos;].
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-1.5 font-mono text-[9px] text-[var(--text-faint)]">
            <span>Duration: {camStep?.durationMs || 1450}ms</span>
            <span>Final Output: CAM / KFS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
