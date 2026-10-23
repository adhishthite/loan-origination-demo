import { Check, Loader2, Paperclip } from "lucide-react";
import { useState } from "react";
import type { LoanApplication, LoanPurpose } from "../../types/los";
import { formatINR } from "../../utils/formatters";

interface ApplicationFormProps {
  application: LoanApplication;
  onUpdateApplication: (app: LoanApplication) => void;
  onSubmitForEvaluation: () => void;
  isEvaluating: boolean;
}

type DocKey = "panCard" | "bankStatement" | "salarySlip";

const TENURES = [12, 24, 36, 48, 60];

const PURPOSES: { value: LoanPurpose; label: string }[] = [
  { value: "HOME_RENOVATION", label: "Home renovation" },
  { value: "WORKING_CAPITAL", label: "Business working capital" },
  { value: "DEBT_CONSOLIDATION", label: "Debt consolidation" },
  { value: "EDUCATION", label: "Higher education" },
  { value: "MEDICAL_EMERGENCY", label: "Medical emergency" },
];

const DOCUMENTS: {
  key: DocKey;
  name: string;
  file: string;
  size: string;
}[] = [
  {
    key: "panCard",
    name: "PAN card",
    file: "pan_card_front.jpg",
    size: "1.2 MB",
  },
  {
    key: "bankStatement",
    name: "Bank statement — last 6 months",
    file: "bank_statement_6m.pdf",
    size: "4.8 MB",
  },
  {
    key: "salarySlip",
    name: "Salary slips / ITR",
    file: "salary_slips_3m.pdf",
    size: "2.1 MB",
  },
];

function formatDob(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReadOnlyField({
  id,
  label,
  value,
  numeric,
}: {
  id: string;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        readOnly
        value={value}
        className={`field ${numeric ? "num" : ""}`}
      />
    </div>
  );
}

export function ApplicationForm({
  application,
  onUpdateApplication,
  onSubmitForEvaluation,
  isEvaluating,
}: ApplicationFormProps) {
  const uploaded = application.documentsUploaded;
  const [docUploads, setDocUploads] = useState({
    panCard: uploaded?.panCard ?? false,
    bankStatement: uploaded?.bankStatement ?? false,
    salarySlip: uploaded?.salarySlip ?? false,
  });

  const applicant = application.applicant;
  const loan = application.loanRequest;

  const handleAmountChange = (newAmount: number) => {
    onUpdateApplication({
      ...application,
      loanRequest: { ...application.loanRequest, amount: newAmount },
    });
  };

  const handleTenureChange = (tenure: number) => {
    onUpdateApplication({
      ...application,
      loanRequest: { ...application.loanRequest, tenureMonths: tenure },
    });
  };

  const handlePurposeChange = (purpose: LoanPurpose) => {
    onUpdateApplication({
      ...application,
      loanRequest: { ...application.loanRequest, purpose },
    });
  };

  const toggleDoc = (docKey: DocKey) => {
    const updated = { ...docUploads, [docKey]: !docUploads[docKey] };
    setDocUploads(updated);
    onUpdateApplication({ ...application, documentsUploaded: updated });
  };

  const isFormLocked =
    application.status === "AUTO_APPROVED" ||
    application.status === "APPROVED" ||
    application.status === "DISBURSED" ||
    application.status === "REJECTED";
  const controlsDisabled = isFormLocked || isEvaluating;

  return (
    <section
      className="sheet min-w-0 overflow-hidden"
      aria-labelledby="application-title"
    >
      <div className="px-5 pt-5 pb-1">
        <h2 id="application-title" className="text-[20px] font-semibold">
          {application.applicant.employmentType === "SELF_EMPLOYED"
            ? "Business loan application"
            : "Personal loan application"}
        </h2>
      </div>

      {/* Loan */}
      <div className="space-y-5 p-5">
        <h3 className="section-title">Loan</h3>

        <div>
          <label htmlFor="loan-amount-slider" className="label">
            Amount
          </label>
          <div className="num mb-3 text-[28px] font-semibold leading-tight tracking-tight">
            {formatINR(loan?.amount ?? 0)}
          </div>
          <input
            id="loan-amount-slider"
            type="range"
            min={100000}
            max={5000000}
            step={25000}
            disabled={controlsDisabled}
            value={loan?.amount ?? 100000}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="w-full cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="num mt-1 flex justify-between text-[12px] text-faint">
            <span>₹1 L</span>
            <span>₹25 L</span>
            <span>₹50 L</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div>
            <fieldset>
              <legend className="label">Tenure</legend>
              <div className="flex w-full rounded-md border border-rule p-0.5">
                {TENURES.map((t) => {
                  const selected = loan?.tenureMonths === t;
                  return (
                    <label
                      key={t}
                      className={`num flex-1 cursor-pointer rounded-[5px] py-1.5 text-center text-[13px] font-medium transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-agent ${
                        selected
                          ? "bg-ink text-sheet"
                          : "text-graphite hover:bg-sunken hover:text-ink"
                      }`}
                    >
                      <input
                        type="radio"
                        name="loan-tenure"
                        value={t}
                        checked={selected}
                        disabled={controlsDisabled}
                        onChange={() => handleTenureChange(t)}
                        className="sr-only"
                      />
                      {t}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="mt-1 text-[12px] text-faint">months</p>
          </div>

          <div>
            <label htmlFor="loan-purpose-select" className="label">
              Purpose
            </label>
            <select
              id="loan-purpose-select"
              disabled={controlsDisabled}
              value={loan?.purpose}
              onChange={(e) =>
                handlePurposeChange(e.target.value as LoanPurpose)
              }
              className="field disabled:cursor-not-allowed disabled:bg-sunken"
            >
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* About you */}
      <div className="space-y-4 border-t border-rule p-5">
        <h3 className="section-title">About you</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            id="applicant-full-name"
            label="Full name"
            value={applicant?.fullName ?? "—"}
          />
          <ReadOnlyField
            id="applicant-dob"
            label="Date of birth"
            value={formatDob(applicant?.dob)}
          />
          <ReadOnlyField
            id="applicant-tax-id"
            label="PAN"
            value={applicant?.taxId ?? "—"}
          />
          <ReadOnlyField
            id="applicant-employment-type"
            label="Employment"
            value={
              applicant?.employmentType === "SELF_EMPLOYED"
                ? "Self-employed"
                : "Salaried"
            }
          />
          <ReadOnlyField
            id="applicant-declared-income"
            label="Declared monthly income"
            value={formatINR(applicant?.declaredMonthlyIncome ?? 0)}
            numeric
          />
        </div>
      </div>

      {/* Documents */}
      <div className="border-t border-rule p-5">
        <h3 className="section-title mb-2">Documents</h3>
        <ul className="divide-y divide-rule">
          {DOCUMENTS.map((doc) => {
            const attached = docUploads[doc.key];
            return (
              <li
                key={doc.key}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      attached
                        ? "bg-approve-tint text-approve"
                        : "border border-dashed border-rule-strong text-faint"
                    }`}
                  >
                    {attached ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <Paperclip className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] text-ink">{doc.name}</div>
                    <div className="num truncate text-[12px] text-graphite">
                      {attached ? `${doc.file}, ${doc.size}` : "Not attached"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isFormLocked}
                  onClick={() => toggleDoc(doc.key)}
                  aria-label={
                    attached ? `Remove ${doc.name}` : `Attach ${doc.name}`
                  }
                  className="btn btn-ghost shrink-0 px-2.5 py-1.5"
                >
                  {attached ? "Remove" : "Attach"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-rule bg-sunken/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {isFormLocked ? (
          <p className="text-[13px] text-graphite">
            Underwriting is complete. Inputs are locked for this application.
          </p>
        ) : (
          <>
            <p className="max-w-md text-[13px] text-graphite">
              Agents verify documents, pull the bureau over A2A and apply credit
              policy.
            </p>
            <button
              type="button"
              disabled={isEvaluating}
              onClick={onSubmitForEvaluation}
              className="btn btn-agent shrink-0"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Underwriting…
                </>
              ) : (
                "Run underwriting"
              )}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
