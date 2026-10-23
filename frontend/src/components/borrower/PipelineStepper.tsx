import { AlertTriangle, Check, X } from "lucide-react";
import type { ApplicationStatus } from "../../types/los";
import { StatusPill } from "../shared/Header";

interface PipelineStepperProps {
  status: ApplicationStatus;
  isEvaluating?: boolean;
}

type StepState = "completed" | "current" | "pending" | "paused" | "failed";

interface Step {
  id: string;
  name: string;
  detail: string;
  agent: string;
  a2a?: boolean;
}

const STEPS: Step[] = [
  {
    id: "intake",
    name: "Application received",
    detail: "Request and documents saved to the file",
    agent: "los_orchestrator_agent",
  },
  {
    id: "kyc_spread",
    name: "Documents verified",
    detail: "Identity matched, bank statement spread",
    agent: "ParallelAgent",
  },
  {
    id: "a2a_bureau",
    name: "Credit bureau checked",
    detail: "Score and repayment history from the bureau",
    agent: "RemoteA2aAgent",
    a2a: true,
  },
  {
    id: "policy",
    name: "Credit policy applied",
    detail: "Six policy rules and repayment-to-income ratio",
    agent: "FunctionTool",
  },
  {
    id: "decision",
    name: "Decision",
    detail: "Credit memo and offer prepared",
    agent: "cam_synthesizer_agent",
  },
];

function getStepState(
  status: ApplicationStatus,
  isEvaluating: boolean,
  index: number,
): StepState {
  if (isEvaluating || status === "SUBMITTED") {
    if (index <= 1) return "completed";
    if (index === 2) return "current";
    return "pending";
  }
  if (status === "DRAFT") return index === 0 ? "current" : "pending";
  if (status === "KYC_VERIFICATION") {
    if (index === 0) return "completed";
    if (index === 1) return "current";
    return "pending";
  }
  if (status === "UNDERWRITING") {
    if (index <= 2) return "completed";
    if (index === 3) return "current";
    return "pending";
  }
  if (status === "MANUAL_REVIEW") return index < 4 ? "completed" : "paused";
  if (status === "REJECTED") return index < 4 ? "completed" : "failed";
  if (
    status === "AUTO_APPROVED" ||
    status === "APPROVED" ||
    status === "OFFER_GENERATED" ||
    status === "DISBURSED"
  ) {
    return "completed";
  }
  return "pending";
}

const MARKER_CLASS: Record<StepState, string> = {
  completed: "bg-approve text-sheet",
  current: "bg-agent text-white",
  paused: "bg-review text-white",
  failed: "bg-decline text-white",
  pending: "border border-rule-strong bg-sheet text-faint",
};

const STATE_LABEL: Record<StepState, string> = {
  completed: "done",
  current: "in progress",
  paused: "waiting for an underwriter",
  failed: "declined",
  pending: "not started",
};

export function PipelineStepper({
  status,
  isEvaluating = false,
}: PipelineStepperProps) {
  return (
    <section className="sheet" aria-labelledby="progress-title">
      <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <h2 id="progress-title" className="section-title">
          Progress
        </h2>
        {isEvaluating ? (
          <span className="pill pill-agent">Running</span>
        ) : (
          <StatusPill status={status} />
        )}
      </div>

      <ol className="px-5 py-4">
        {STEPS.map((step, idx) => {
          const state = getStepState(status, isEvaluating, idx);
          const isLast = idx === STEPS.length - 1;
          const pulse = state === "current" && isEvaluating;
          return (
            <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute top-7 bottom-1 left-[11px] w-px ${
                    state === "completed" ? "bg-approve/40" : "bg-rule"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`num relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  MARKER_CLASS[state]
                } ${pulse ? "animate-pulse" : ""}`}
              >
                {state === "completed" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : state === "paused" ? (
                  <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                ) : state === "failed" ? (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[14px] font-medium leading-5 ${
                      state === "pending" ? "text-graphite" : "text-ink"
                    }`}
                  >
                    {step.name}
                    <span className="sr-only">, {STATE_LABEL[state]}</span>
                  </span>
                  {step.a2a && <span className="pill pill-agent">A2A</span>}
                </div>
                <p className="text-[13px] text-graphite">{step.detail}</p>
                <p className="text-[12px] text-faint">{step.agent}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
