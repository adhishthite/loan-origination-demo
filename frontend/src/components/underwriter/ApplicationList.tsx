import { CheckCircle2, Clock, Filter, Search, XCircle } from "lucide-react";
import { useState } from "react";
import type { ApplicationStatus, LoanApplication } from "../../types/los";
import { formatDate, formatINRLakh, maskTaxId } from "../../utils/formatters";

interface ApplicationListProps {
  applications: LoanApplication[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ApplicationList({
  applications,
  selectedId,
  onSelect,
}: ApplicationListProps) {
  const [filter, setFilter] = useState<"ALL" | ApplicationStatus>("ALL");
  const [search, setSearch] = useState("");

  const filtered = applications.filter((app) => {
    if (filter !== "ALL" && app.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        app.applicant.fullName.toLowerCase().includes(q) ||
        app.applicant.taxId.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "AUTO_APPROVED":
      case "APPROVED":
      case "DISBURSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {status}
          </span>
        );
      case "MANUAL_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="h-2.5 w-2.5" />
            REVIEW
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
            <XCircle className="h-2.5 w-2.5" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs">
      <div className="border-b border-[var(--border-subtle)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Applications Pipeline</span>
          </div>
          <span className="rounded-full bg-[var(--bg-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
            {filtered.length} total
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Search by name, PAN, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] py-1.5 pr-2 pl-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(["ALL", "MANUAL_REVIEW", "AUTO_APPROVED", "REJECTED"] as const).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  filter === s
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                }`}
              >
                {s === "ALL" ? "All" : s === "MANUAL_REVIEW" ? "Review" : s}
              </button>
            ),
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-[var(--border-subtle)] overflow-y-auto">
        {filtered.map((app) => {
          const isSelected = app.id === selectedId;

          return (
            <button
              type="button"
              key={app.id}
              onClick={() => onSelect(app.id)}
              className={`w-full text-left cursor-pointer p-3 transition-colors ${
                isSelected
                  ? "border-l-4 border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                  : "hover:bg-[var(--bg-muted)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  {app.applicant.fullName}
                </span>
                {getStatusBadge(app.status)}
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatINRLakh(app.loanRequest.amount)}
                </span>
                <span className="text-[var(--text-faint)]">
                  {app.loanRequest.tenureMonths}m •{" "}
                  {app.applicant.employmentType}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-faint)]">
                <span className="font-mono">
                  {maskTaxId(app.applicant.taxId)}
                </span>
                <span>{formatDate(app.createdAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
