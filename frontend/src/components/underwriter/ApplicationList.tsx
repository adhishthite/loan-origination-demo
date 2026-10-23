import { Search } from "lucide-react";
import { useState } from "react";
import type { ApplicationStatus, LoanApplication } from "../../types/los";
import { formatINRLakh, maskTaxId } from "../../utils/formatters";
import { StatusPill } from "../shared/Header";

type QueueFilter = "all" | "review" | "approved" | "declined";

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "review", label: "Review" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
];

const APPROVED: ApplicationStatus[] = [
  "AUTO_APPROVED",
  "APPROVED",
  "OFFER_GENERATED",
  "DISBURSED",
];

function matchesFilter(status: ApplicationStatus, f: QueueFilter): boolean {
  switch (f) {
    case "review":
      return status === "MANUAL_REVIEW";
    case "approved":
      return APPROVED.includes(status);
    case "declined":
      return status === "REJECTED";
    default:
      return true;
  }
}

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
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");

  const all = applications ?? [];
  const q = search.trim().toLowerCase();
  const filtered = all.filter((app) => {
    if (!matchesFilter(app.status, filter)) return false;
    if (!q) return true;
    return (
      (app.applicant?.fullName ?? "").toLowerCase().includes(q) ||
      (app.applicant?.taxId ?? "").toLowerCase().includes(q)
    );
  });
  const reviewCount = all.filter((a) => a.status === "MANUAL_REVIEW").length;

  return (
    <section className="sheet" aria-label="Application queue">
      <div className="space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Queue</h2>
          <span className="text-[12px] text-graphite">
            <span className="num">{reviewCount}</span> waiting on you
          </span>
        </div>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or PAN"
            aria-label="Search applications"
            className="field pl-8 text-[13px]"
          />
        </div>

        <fieldset className="grid grid-cols-4 gap-0.5 rounded-md bg-sunken p-0.5">
          <legend className="sr-only">Filter by status</legend>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`rounded-[5px] px-1 py-1 text-[12px] font-medium leading-tight transition-colors ${
                  active
                    ? "bg-sheet text-ink shadow-[0_0_0_1px_var(--rule)]"
                    : "text-graphite hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      {filtered.length === 0 ? (
        <p className="border-t border-rule px-4 py-6 text-center text-[13px] text-graphite">
          No applications match. Clear the search or pick another filter.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {filtered.map((app) => {
            const selected = app.id === selectedId;
            return (
              <li key={app.id} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(app.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`relative block w-full px-4 py-3 text-left transition-colors ${
                    selected ? "bg-sunken" : "hover:bg-sunken/60"
                  }`}
                >
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-0.5 bg-ink"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {app.applicant?.fullName ?? "Unnamed applicant"}
                    </span>
                    <span className="num shrink-0 text-[13px] text-ink">
                      {formatINRLakh(app.loanRequest?.amount ?? 0)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="num text-[12px] text-faint">
                      {maskTaxId(app.applicant?.taxId ?? "")}
                    </span>
                    <StatusPill status={app.status} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
