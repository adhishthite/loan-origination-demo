import { FileStack, History, Moon, Network, Sun } from "lucide-react";
import type { ApplicationStatus } from "../../types/los";

interface HeaderProps {
  activeView: "borrower" | "underwriter";
  onSelectView: (view: "borrower" | "underwriter") => void;
  onOpenA2aModal: () => void;
  onOpenAuditDrawer: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  auditCount: number;
  fileRef: string;
  applicantName: string;
  status: ApplicationStatus;
}

export const STATUS_META: Record<
  ApplicationStatus,
  {
    label: string;
    tone: "approve" | "review" | "decline" | "agent" | "neutral";
  }
> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "agent" },
  KYC_VERIFICATION: { label: "Verifying", tone: "agent" },
  UNDERWRITING: { label: "Underwriting", tone: "agent" },
  AUTO_APPROVED: { label: "Approved", tone: "approve" },
  APPROVED: { label: "Approved", tone: "approve" },
  OFFER_GENERATED: { label: "Offer ready", tone: "approve" },
  DISBURSED: { label: "Disbursed", tone: "approve" },
  MANUAL_REVIEW: { label: "Needs review", tone: "review" },
  REJECTED: { label: "Declined", tone: "decline" },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  return <span className={`pill pill-${meta.tone}`}>{meta.label}</span>;
}

export function Header({
  activeView,
  onSelectView,
  onOpenA2aModal,
  onOpenAuditDrawer,
  isDarkMode,
  onToggleTheme,
  auditCount,
  fileRef,
  applicantName,
  status,
}: HeaderProps) {
  const tab = (view: "borrower" | "underwriter", label: string) => (
    <button
      type="button"
      onClick={() => onSelectView(view)}
      aria-current={activeView === view ? "page" : undefined}
      className={`relative h-14 px-1 text-[13px] font-medium transition-colors ${
        activeView === view ? "text-ink" : "text-graphite hover:text-ink"
      }`}
    >
      {label}
      {activeView === view && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-sheet">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sheet">
            <FileStack className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Credit Desk
          </span>
        </div>

        <nav className="flex items-center gap-5" aria-label="Views">
          {tab("borrower", "Borrower")}
          {tab("underwriter", "Underwriter")}
        </nav>

        <div className="ml-auto hidden min-w-0 items-center gap-3 md:flex">
          <span className="num truncate text-[13px] text-graphite">
            <span className="font-medium text-ink">{applicantName}</span>{" "}
            <span className="text-faint">{fileRef}</span>
          </span>
          <StatusPill status={status} />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button
            type="button"
            onClick={onOpenA2aModal}
            className="btn btn-ghost px-2.5"
            title="Agent card, A2A messages and ADK agent tree"
          >
            <Network className="h-4 w-4 text-agent" />
            <span className="hidden lg:inline">Agents</span>
          </button>
          <button
            type="button"
            onClick={onOpenAuditDrawer}
            className="btn btn-ghost px-2.5"
            title="Audit trail"
          >
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">Audit</span>
            {auditCount > 0 && (
              <span className="num rounded-full bg-sunken px-1.5 text-[11px] text-graphite">
                {auditCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn btn-ghost px-2"
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
