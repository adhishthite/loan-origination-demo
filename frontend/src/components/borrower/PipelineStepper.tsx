import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSearch,
  Network,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { ApplicationStatus } from "../../types/los";

interface PipelineStepperProps {
  status: ApplicationStatus;
  isEvaluating?: boolean;
}

interface Step {
  id: string;
  name: string;
  subtext: string;
  agent: string;
  icon: typeof Bot;
}

const STEPS: Step[] = [
  {
    id: "intake",
    name: "Application Intake",
    subtext: "Payload validated & hashed",
    agent: "API Gateway",
    icon: FileSearch,
  },
  {
    id: "kyc_spread",
    name: "Multimodal Verification",
    subtext: "KYC match & statement spreading",
    agent: "ADK ParallelAgent",
    icon: ShieldCheck,
  },
  {
    id: "a2a_bureau",
    name: "A2A Bureau Federation",
    subtext: "Remote tradelines & watchlist query",
    agent: "RemoteA2aAgent",
    icon: Network,
  },
  {
    id: "policy",
    name: "Deterministic Policy",
    subtext: "POL-01..06 & FOIR computation",
    agent: "FunctionTools",
    icon: Scale,
  },
  {
    id: "decision",
    name: "Decision & Sanction",
    subtext: "CAM Memo & KFS generation",
    agent: "cam_synthesizer_agent",
    icon: Bot,
  },
];

export function PipelineStepper({
  status,
  isEvaluating,
}: PipelineStepperProps) {
  const getStepState = (
    index: number,
  ): "completed" | "current" | "pending" | "paused" | "failed" => {
    if (status === "DRAFT") {
      return index === 0 ? "current" : "pending";
    }

    if (status === "SUBMITTED" || isEvaluating) {
      if (index <= 1) return "completed";
      if (index === 2) return "current";
      return "pending";
    }

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

    if (status === "MANUAL_REVIEW") {
      if (index < 4) return "completed";
      return "paused";
    }

    if (status === "REJECTED") {
      if (index < 4) return "completed";
      return "failed";
    }

    if (
      status === "AUTO_APPROVED" ||
      status === "APPROVED" ||
      status === "OFFER_GENERATED" ||
      status === "DISBURSED"
    ) {
      return "completed";
    }

    return "pending";
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isEvaluating ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
              </>
            ) : status === "AUTO_APPROVED" ||
              status === "APPROVED" ||
              status === "DISBURSED" ? (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            ) : status === "MANUAL_REVIEW" ? (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            )}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            ADK Pipeline Lifecycle
          </span>
        </div>

        <div className="text-xs">
          <span className="font-medium text-[var(--text-muted)]">State: </span>
          <span
            className={`font-semibold ${
              status === "AUTO_APPROVED" ||
              status === "APPROVED" ||
              status === "DISBURSED"
                ? "text-emerald-600 dark:text-emerald-400"
                : status === "MANUAL_REVIEW"
                  ? "text-amber-600 dark:text-amber-400"
                  : status === "REJECTED"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-blue-600 dark:text-blue-400"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {STEPS.map((step, idx) => {
          const state = getStepState(idx);
          const Icon = step.icon;

          let badgeBg =
            "bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border-subtle)]";
          let circleBg =
            "bg-[var(--bg-card)] text-[var(--text-faint)] ring-1 ring-[var(--border-subtle)]";

          if (state === "completed") {
            badgeBg =
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300";
            circleBg = "bg-emerald-600 text-white";
          } else if (state === "current") {
            badgeBg =
              "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300 ring-1 ring-blue-500/30";
            circleBg = "bg-blue-600 text-white animate-pulse";
          } else if (state === "paused") {
            badgeBg =
              "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300";
            circleBg = "bg-amber-500 text-white";
          } else if (state === "failed") {
            badgeBg =
              "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300";
            circleBg = "bg-rose-600 text-white";
          }

          return (
            <div
              key={step.id}
              className={`relative flex flex-col justify-between rounded-lg border p-2.5 transition-all ${badgeBg}`}
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${circleBg}`}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : state === "paused" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <Icon className="h-3.5 w-3.5 opacity-60" />
                </div>
                <div className="font-semibold text-xs leading-snug">
                  {step.name}
                </div>
                <div className="mt-0.5 text-[10px] opacity-75">
                  {step.subtext}
                </div>
              </div>

              <div className="mt-2 text-[9px] font-mono tracking-tight opacity-70">
                {step.agent}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
