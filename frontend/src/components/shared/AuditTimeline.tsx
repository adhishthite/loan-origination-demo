import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ApplicationStatus, AuditLogEntry } from "../../types/los";
import { formatDate, formatTime } from "../../utils/formatters";
import { StatusPill } from "./Header";

interface AuditTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AuditLogEntry[];
}

const ACTION_TEXT: Record<string, string> = {
  APPLICATION_CREATED: "Application created",
  DOCUMENTS_UPLOADED: "Documents attached",
  IDENTITY_VERIFIED: "Identity verified against PAN",
  SPREADING_COMPLETED: "Bank statement analysed",
  BUREAU_PULLED: "Credit bureau report received",
  UNDERWRITING_EVALUATED: "Underwriting completed",
  POLICY_GATE_TRIGGERED: "Credit policy sent the file for review",
  POLICY_KNOCKOUT_EVALUATED: "Credit policy declined the file",
  AUTO_APPROVAL_ISSUED: "Approved automatically",
  OFFER_ACCEPTED_ESIGNED: "Offer signed and accepted",
  KFS_ESIGNED_DISBURSED: "Offer signed and loan disbursed",
  "HITL_DECISION:APPROVE": "Underwriter approved as requested",
  "HITL_DECISION:APPROVE_COUNTER": "Underwriter sent a counter-offer",
  "HITL_DECISION:REJECT": "Underwriter declined the application",
};

function sentenceCase(raw: string): string {
  const text = raw.replace(/[_:]+/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Event";
}

function describeAction(action?: string): string {
  if (!action) return "Event recorded";
  if (ACTION_TEXT[action]) return ACTION_TEXT[action];
  if (action.startsWith("EXECUTE_TOOL:")) {
    return `Ran ${action.slice("EXECUTE_TOOL:".length)}`;
  }
  return sentenceCase(action);
}

function describeActor(actor?: string): { label: string; detail?: string } {
  const value = actor ?? "";
  if (value.startsWith("A2A")) {
    return { label: "A2A", detail: value.split(":")[1] };
  }
  if (value.startsWith("ADK_AGENT")) {
    return { label: "System agent", detail: value.split(":")[1] };
  }
  if (value === "SYSTEM" || value === "") return { label: "System agent" };
  if (value.startsWith("BORROWER")) return { label: "Borrower" };
  return { label: "Credit officer", detail: value };
}

function StatusChange({
  from,
  to,
}: {
  from: ApplicationStatus | null;
  to: ApplicationStatus;
}) {
  if (!to) return null;
  if (!from || from === to) {
    return <StatusPill status={to} />;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[12px] text-faint">
      <StatusPill status={from} />
      <span aria-hidden="true">→</span>
      <span className="sr-only">to</span>
      <StatusPill status={to} />
    </span>
  );
}

export function AuditTimeline({
  isOpen,
  onClose,
  entries,
}: AuditTimelineProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const list = Array.isArray(entries) ? entries : [];

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
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close audit trail"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/30"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col border-l border-rule bg-sheet shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h2 id={titleId} className="text-[16px] font-semibold">
            Audit trail
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {list.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-graphite">
              Nothing recorded yet. Events appear here as agents and people act
              on the file.
            </p>
          ) : (
            <ol className="relative">
              {list.map((entry, idx) => {
                const actor = describeActor(entry.actor);
                const isLast = idx === list.length - 1;
                return (
                  <li
                    key={`${entry.timestamp}-${entry.actor}-${entry.action}`}
                    className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                  >
                    <div className="pt-0.5 text-right">
                      <div className="num text-[13px] text-ink">
                        {formatTime(entry.timestamp)}
                      </div>
                      <div className="num text-[12px] text-faint">
                        {formatDate(entry.timestamp)}
                      </div>
                    </div>
                    <div className="relative border-l border-rule pl-4">
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 -left-[4px] h-[7px] w-[7px] rounded-full bg-rule-strong"
                      />
                      {isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute top-4 bottom-0 -left-px w-px bg-sheet"
                        />
                      )}
                      <p className="text-[14px] text-ink">
                        {describeAction(entry.action)}
                      </p>
                      <p className="text-[12px] text-graphite">
                        {actor.label}
                        {actor.detail && (
                          <span className="text-faint">, {actor.detail}</span>
                        )}
                      </p>
                      <div className="mt-1.5">
                        <StatusChange
                          from={entry.previousStatus}
                          to={entry.newStatus}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="border-t border-rule px-5 py-3 text-[12px] text-faint">
          Write-once log recorded by ADK callbacks.
        </p>
      </div>
    </div>
  );
}
