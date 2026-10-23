import {
  Check,
  Copy,
  Layers,
  Network,
  Radio,
  Server,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";
import { MOCK_A2A_AGENT_CARDS } from "../../api/mockData";
import type { A2aExchangeRecord, AdkAgentStepExecution } from "../../types/los";

interface A2aInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  a2aRecords: A2aExchangeRecord[];
  adkSteps: AdkAgentStepExecution[];
}

export function A2aInspectorModal({
  isOpen,
  onClose,
  a2aRecords,
  adkSteps,
}: A2aInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<
    "cards" | "wire" | "topology" | "gemini_publish"
  >("cards");
  const [selectedCard, setSelectedCard] = useState<
    "los_underwriter" | "credit_bureau"
  >("credit_bureau");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCard = MOCK_A2A_AGENT_CARDS[selectedCard];

  const publishCliSnippet = `# 1. Export Cloud Run service URL
export LOS_SERVICE_URL="https://los-underwriter.internal.bank.gcp"
export GEMINI_APP_ID="projects/fsi-production-ai/locations/global/collections/default_collection/engines/retail-los-engine"

# 2. Register Root A2A Agent Card with Gemini Enterprise
agents-cli publish gemini \\
  --agent-card-url "\${LOS_SERVICE_URL}/a2a/los_underwriter/.well-known/agent-card.json" \\
  --gemini-app-id "\${GEMINI_APP_ID}" \\
  --display-name "Retail Loan Underwriting Agent" \\
  --tags "fsi,underwriting,adk,a2a"`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(publishCliSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex h-[90vh] max-h-[850px] w-full max-w-5xl flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Google ADK & A2A Protocol Inspector
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-[var(--text-faint)]">
                Agent-to-Agent (A2A) Federation & ADK Execution State Monitor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] px-6 bg-[var(--bg-muted)]">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "cards"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-[var(--bg-card)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Agent Cards (/.well-known)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("wire")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "wire"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-[var(--bg-card)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>A2A Wire Payloads ({a2aRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("topology")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "topology"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-[var(--bg-card)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ADK Multi-Agent Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gemini_publish")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "gemini_publish"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-[var(--bg-card)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Gemini Enterprise CLI</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {/* TAB 1: AGENT CARDS */}
          {activeTab === "cards" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Inspect Agent Card:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCard("credit_bureau")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedCard === "credit_bureau"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  }`}
                >
                  Federated Credit Bureau A2A Agent Card
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCard("los_underwriter")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedCard === "los_underwriter"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  }`}
                >
                  Root LOS Orchestrator A2A Agent Card
                </button>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 font-mono">
                <div className="mb-2 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-[11px] text-[var(--text-muted)]">
                  <span>Endpoint: {currentCard.endpoints.agentCard}</span>
                  <span>Protocol: {currentCard.protocol}</span>
                </div>
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-[var(--text-primary)]">
                  {JSON.stringify(currentCard, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: A2A WIRE PAYLOADS */}
          {activeTab === "wire" && (
            <div className="space-y-4">
              {a2aRecords.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-faint)]">
                  No A2A wire transactions recorded yet.
                </div>
              ) : (
                a2aRecords.map((record) => (
                  <div
                    key={record.exchangeId}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {record.exchangeId}
                        </span>
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-700 dark:text-purple-300">
                          {record.protocol}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
                        <span>
                          Latency:{" "}
                          <strong className="text-emerald-600">
                            {record.latencyMs}ms
                          </strong>
                        </span>
                        <span>•</span>
                        <span>{record.timestamp}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 font-mono text-[11px]">
                      <div>
                        <div className="mb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          Outbound JSON-RPC Request (Caller:{" "}
                          {record.callerAgent})
                        </div>
                        <pre className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)] overflow-x-auto text-[var(--text-primary)]">
                          {JSON.stringify(record.requestPayload, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          Inbound JSON-RPC Response (Target:{" "}
                          {record.targetAgent})
                        </div>
                        <pre className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)] overflow-x-auto text-[var(--text-primary)]">
                          {JSON.stringify(record.responsePayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ADK TOPOLOGY */}
          {activeTab === "topology" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-2">
                  ADK Agent Hierarchy & Tool Bindings
                </h4>
                <div className="space-y-3 font-mono text-xs">
                  <div className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)]">
                    <span className="font-bold text-blue-600">
                      SequentialAgent
                    </span>
                    : los_orchestrator_agent
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-blue-500/30 pl-3">
                      <div>
                        <span className="font-bold text-purple-600">
                          ParallelAgent
                        </span>
                        : parallel_verification_stage
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-purple-500/30 pl-3 text-[11px]">
                          <div>
                            •{" "}
                            <span className="font-semibold">
                              kyc_fraud_agent
                            </span>{" "}
                            (LlmAgent + FunctionTool[run_kyc_verification_tool])
                          </div>
                          <div>
                            •{" "}
                            <span className="font-semibold">
                              financial_spreading_agent
                            </span>{" "}
                            (LlmAgent +
                            FunctionTool[run_document_spreading_tool])
                          </div>
                          <div>
                            •{" "}
                            <span className="font-semibold">
                              bureau_a2a_bridge
                            </span>{" "}
                            (RemoteA2aAgent -&gt; A2A Bureau Server)
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-600">
                          LlmAgent
                        </span>
                        : deterministic_policy_agent
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-500/30 pl-3 text-[11px]">
                          <div>
                            • FunctionTool[compute_financial_ratios_tool] (EMI,
                            FOIR, APR Tier)
                          </div>
                          <div>
                            • FunctionTool[evaluate_credit_policy_tool]
                            (POL-01..06)
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-600">
                          LlmAgent
                        </span>
                        : cam_synthesizer_agent
                        <div className="ml-4 mt-1 border-l-2 border-emerald-500/30 pl-3 text-[11px]">
                          <div>
                            • FunctionTool[synthesize_cam_and_offer_tool] +
                            ResumabilityConfig (HITL Pause)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)]">
                  <div className="font-bold text-xs text-[var(--text-primary)] mb-2">
                    Live Session Agent Executions ({adkSteps.length})
                  </div>
                  <div className="space-y-2">
                    {adkSteps.map((step) => (
                      <div
                        key={step.agentName}
                        className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-[var(--bg-muted)]"
                      >
                        <span>
                          {step.agentName} ({step.agentType})
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {step.status} • {step.durationMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEMINI ENTERPRISE CLI */}
          {activeTab === "gemini_publish" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-950 dark:text-blue-200">
                    Registration with Google Gemini Enterprise (agents-cli
                    publish gemini)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copied ? "Copied" : "Copy Command"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-blue-900/80 dark:text-blue-300 mb-3">
                  This command registers the LOS A2A Agent Card into the Google
                  Agent Registry so enterprise users and Branch RMs can converse
                  with the underwriting agent directly inside Gemini.
                </p>
                <pre className="rounded-lg bg-[var(--bg-card)] p-3 border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto leading-relaxed">
                  {publishCliSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3 bg-[var(--bg-muted)] text-[11px] text-[var(--text-faint)]">
          <span>TRD-A2A-01: A2A JSON-RPC 2.0 Compliance Verified</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 font-semibold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
