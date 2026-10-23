import { History, X } from "lucide-react";
import type { AuditLogEntry } from "../../types/los";
import { formatDateTime } from "../../utils/formatters";

interface AuditTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AuditLogEntry[];
}

export function AuditTimeline({
  isOpen,
  onClose,
  entries,
}: AuditTimelineProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Immutable Audit Trail
              </h3>
              <p className="text-[10px] text-[var(--text-faint)]">
                Recorded via ADK callbacks (TRD-NFR-02)
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

        {/* Entries List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-faint)]">
              No audit entries recorded yet.
            </div>
          ) : (
            entries.map((entry) => {
              const isAgent = entry.actor.startsWith("ADK_AGENT");
              const isA2a = entry.actor.startsWith("A2A_REMOTE");
              const isOfficer = entry.actor.startsWith("CREDIT_OFFICER");

              return (
                <div
                  key={`${entry.timestamp}-${entry.action}`}
                  className="relative rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[var(--text-faint)]">
                      {formatDateTime(entry.timestamp)}
                    </span>
                    <span className="rounded bg-[var(--bg-card)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {entry.policyVersion}
                    </span>
                  </div>

                  <div className="font-semibold text-[var(--text-primary)]">
                    {entry.action}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="text-[var(--text-faint)]">Actor:</span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isAgent
                          ? "text-blue-600 dark:text-blue-400"
                          : isA2a
                            ? "text-purple-600 dark:text-purple-400"
                            : isOfficer
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600"
                      }`}
                    >
                      {entry.actor}
                    </span>
                  </div>

                  {entry.previousStatus && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                      <span>Status transition:</span>
                      <span className="font-semibold">
                        {entry.previousStatus}
                      </span>
                      <span>&rarr;</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {entry.newStatus}
                      </span>
                    </div>
                  )}

                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <pre className="mt-2 rounded bg-[var(--bg-card)] p-2 font-mono text-[9px] text-[var(--text-muted)] border border-[var(--border-subtle)] overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] p-3 text-center text-[10px] text-[var(--text-faint)]">
          Total Entries: {entries.length} • WORM (Write Once Read Many) Audit
          Log
        </div>
      </div>
    </div>
  );
}
