import { Check, ChevronRight, Copy, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MOCK_A2A_AGENT_CARDS } from "../../api/mockData";
import type { A2aExchangeRecord, AdkAgentStepExecution } from "../../types/los";
import { formatTime } from "../../utils/formatters";

interface A2aInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  a2aRecords: A2aExchangeRecord[];
  adkSteps: AdkAgentStepExecution[];
}

type Tab = "tree" | "messages" | "cards";

const TABS: { id: Tab; label: string }[] = [
  { id: "tree", label: "Agent tree" },
  { id: "messages", label: "A2A messages" },
  { id: "cards", label: "Agent cards" },
];

interface TreeNode {
  name: string;
  kind: string;
  note?: string;
  tools?: string[];
  children?: TreeNode[];
}

const AGENT_TREE: TreeNode = {
  name: "los_orchestrator_agent",
  kind: "SequentialAgent",
  children: [
    {
      name: "parallel_verification_stage",
      kind: "ParallelAgent",
      children: [
        {
          name: "kyc_fraud_agent",
          kind: "LlmAgent",
          tools: ["run_kyc_verification_tool"],
        },
        {
          name: "financial_spreading_agent",
          kind: "LlmAgent",
          tools: ["run_document_spreading_tool"],
        },
        {
          name: "credit_bureau_a2a_bridge",
          kind: "RemoteA2aAgent",
          note: "Calls the credit bureau agent over A2A",
        },
      ],
    },
    {
      name: "deterministic_policy_agent",
      kind: "LlmAgent",
      tools: ["compute_financial_ratios_tool", "evaluate_credit_policy_tool"],
    },
    {
      name: "cam_synthesizer_agent",
      kind: "LlmAgent",
      tools: ["synthesize_cam_and_offer_tool"],
      note: "Pauses for an underwriter when policy says review",
    },
  ],
};

const STEP_STATUS: Record<
  AdkAgentStepExecution["status"],
  { label: string; tone: string }
> = {
  PENDING: { label: "Not run", tone: "pill-neutral" },
  RUNNING: { label: "Running", tone: "pill-agent" },
  COMPLETED: { label: "Done", tone: "pill-approve" },
  PAUSED_HITL: { label: "Paused for review", tone: "pill-review" },
  FAILED: { label: "Failed", tone: "pill-decline" },
};

const CARD_OPTIONS = [
  {
    key: "los_underwriter",
    label: "LOS underwriter",
    direction: "Inbound",
  },
  {
    key: "credit_bureau",
    label: "Credit bureau",
    direction: "Outbound",
  },
] as const;

const PUBLISH_COMMAND = `agents-cli publish gemini \\
  --agent-card-url "https://los-underwriter.internal.bank.gcp/a2a/los_underwriter/.well-known/agent-card.json" \\
  --display-name "Retail loan underwriting agent"`;

function TreeView({
  node,
  steps,
  depth = 0,
}: {
  node: TreeNode;
  steps: AdkAgentStepExecution[];
  depth?: number;
}) {
  const run = steps.find((s) => s.agentName === node.name);
  const meta = run ? STEP_STATUS[run.status] : undefined;
  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2.5"
        style={{ paddingLeft: depth * 20 }}
      >
        <span className="font-mono text-[13px] text-ink">{node.name}</span>
        <span className="text-[12px] text-graphite">{node.kind}</span>
        {meta && (
          <span className={`pill ${meta.tone}`}>
            {meta.label}
            {run && run.durationMs > 0 && (
              <span className="num font-normal">{run.durationMs} ms</span>
            )}
          </span>
        )}
        {(node.tools ?? []).length > 0 && (
          <div className="basis-full text-[12px] text-graphite">
            Tools:{" "}
            {(node.tools ?? []).map((t, i) => (
              <span key={t}>
                {i > 0 && ", "}
                <span className="font-mono">{t}</span>
              </span>
            ))}
          </div>
        )}
        {node.note && (
          <div className="basis-full text-[12px] text-faint">{node.note}</div>
        )}
      </div>
      {(node.children ?? []).length > 0 && (
        <ul>
          {(node.children ?? []).map((child) => (
            <TreeView
              key={child.name}
              node={child}
              steps={steps}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[12px] font-medium text-graphite">{label}</p>
      <pre className="max-h-72 overflow-auto rounded-md bg-sunken p-3 font-mono text-[12px] leading-relaxed text-ink">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function A2aInspectorModal({
  isOpen,
  onClose,
  a2aRecords,
  adkSteps,
}: A2aInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tree");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] =
    useState<(typeof CARD_OPTIONS)[number]["key"]>("los_underwriter");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const records = Array.isArray(a2aRecords) ? a2aRecords : [];
  const steps = Array.isArray(adkSteps) ? adkSteps : [];

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const card = MOCK_A2A_AGENT_CARDS[selectedCard];

  const handleCopy = () => {
    navigator.clipboard?.writeText(PUBLISH_COMMAND).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close agents"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-charcoal/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-[85vh] max-h-[800px] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-rule bg-sheet shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h2 id={titleId} className="text-[16px] font-semibold">
            Agents
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost px-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Agent views"
          className="flex gap-5 border-b border-rule px-5"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${titleId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${titleId}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-3 text-[13px] font-medium transition-colors ${
                  selected ? "text-ink" : "text-graphite hover:text-ink"
                }`}
              >
                {tab.label}
                {tab.id === "messages" && records.length > 0 && (
                  <span className="num ml-1.5 text-faint">
                    {records.length}
                  </span>
                )}
                {selected && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />
                )}
              </button>
            );
          })}
        </div>

        <div
          id={`${titleId}-panel`}
          role="tabpanel"
          aria-labelledby={`${titleId}-tab-${activeTab}`}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {activeTab === "tree" && (
            <div>
              <p className="mb-2 text-[13px] text-graphite">
                The ADK agents and tools that ran this application. Status is
                from the latest run.
              </p>
              <ul className="border-t border-rule">
                <TreeView node={AGENT_TREE} steps={steps} />
              </ul>
            </div>
          )}

          {activeTab === "messages" &&
            (records.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-graphite">
                No A2A messages yet. Run underwriting to call the credit bureau
                agent.
              </p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {records.map((record, idx) => {
                  const key = record.exchangeId || `exchange-${idx}`;
                  const isOpenRow = expanded === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        aria-expanded={isOpenRow}
                        onClick={() => setExpanded(isOpenRow ? null : key)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-sunken/60"
                      >
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-faint transition-transform ${
                            isOpenRow ? "rotate-90" : ""
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          <span className="font-mono text-ink">
                            {record.callerAgent ?? "caller"}
                          </span>
                          <span className="px-2 text-faint">to</span>
                          <span className="font-mono text-agent">
                            {record.targetAgent ?? "target"}
                          </span>
                        </span>
                        {record.timestamp && (
                          <span className="num hidden text-[12px] text-faint sm:inline">
                            {formatTime(record.timestamp)}
                          </span>
                        )}
                        <span className="num w-16 text-right text-[13px] text-graphite">
                          {record.latencyMs ?? 0} ms
                        </span>
                      </button>
                      {isOpenRow && (
                        <div className="grid grid-cols-1 gap-3 pb-4 pl-7 lg:grid-cols-2">
                          <JsonBlock
                            label="Request"
                            value={record.requestPayload}
                          />
                          <JsonBlock
                            label="Response"
                            value={record.responsePayload}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

          {activeTab === "cards" && (
            <div className="space-y-5">
              <fieldset className="inline-flex rounded-md border border-rule p-0.5">
                <legend className="sr-only">Agent card</legend>
                {CARD_OPTIONS.map((opt) => {
                  const selected = selectedCard === opt.key;
                  return (
                    <label
                      key={opt.key}
                      className={`cursor-pointer rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-agent ${
                        selected
                          ? "bg-brand text-white"
                          : "text-graphite hover:bg-sunken hover:text-ink"
                      }`}
                    >
                      <input
                        type="radio"
                        name="agent-card"
                        value={opt.key}
                        checked={selected}
                        onChange={() => setSelectedCard(opt.key)}
                        className="sr-only"
                      />
                      {opt.label}
                      <span
                        className={`ml-1.5 font-normal ${selected ? "opacity-70" : "text-faint"}`}
                      >
                        {opt.direction}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {card ? (
                <div>
                  <p className="mb-1 text-[12px] text-graphite">
                    Served at{" "}
                    <span className="font-mono text-ink">
                      {card.endpoints?.agentCard ?? card.url}
                    </span>
                  </p>
                  <pre className="max-h-[360px] overflow-auto rounded-md bg-sunken p-3 font-mono text-[12px] leading-relaxed text-ink">
                    {JSON.stringify(card, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-[13px] text-graphite">
                  Agent card not available.
                </p>
              )}

              <div className="border-t border-rule pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="section-title">
                    Publish to Gemini Enterprise
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn btn-secondary px-2.5 py-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-approve" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy command
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-sunken p-3 font-mono text-[12px] leading-relaxed text-ink">
                  {PUBLISH_COMMAND}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
