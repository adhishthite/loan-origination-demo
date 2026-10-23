import {
  Briefcase,
  CheckCircle,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  Send,
  UploadCloud,
  User,
} from "lucide-react";
import { useState } from "react";
import type {
  EmploymentType,
  LoanApplication,
  LoanPurpose,
} from "../../types/los";
import { formatINR } from "../../utils/formatters";

interface ApplicationFormProps {
  application: LoanApplication;
  onUpdateApplication: (app: LoanApplication) => void;
  onSubmitForEvaluation: () => void;
  isEvaluating: boolean;
}

export function ApplicationForm({
  application,
  onUpdateApplication,
  onSubmitForEvaluation,
  isEvaluating,
}: ApplicationFormProps) {
  const [docUploads, setDocUploads] = useState({
    panCard: application.documentsUploaded.panCard,
    bankStatement: application.documentsUploaded.bankStatement,
    salarySlip: application.documentsUploaded.salarySlip,
  });

  const handleAmountChange = (newAmount: number) => {
    onUpdateApplication({
      ...application,
      loanRequest: {
        ...application.loanRequest,
        amount: newAmount,
      },
    });
  };

  const handleTenureChange = (tenure: number) => {
    onUpdateApplication({
      ...application,
      loanRequest: {
        ...application.loanRequest,
        tenureMonths: tenure,
      },
    });
  };

  const handlePurposeChange = (purpose: LoanPurpose) => {
    onUpdateApplication({
      ...application,
      loanRequest: {
        ...application.loanRequest,
        purpose,
      },
    });
  };

  const toggleDoc = (docKey: "panCard" | "bankStatement" | "salarySlip") => {
    const updated = {
      ...docUploads,
      [docKey]: !docUploads[docKey],
    };
    setDocUploads(updated);
    onUpdateApplication({
      ...application,
      documentsUploaded: updated,
    });
  };

  const isFormLocked =
    application.status === "AUTO_APPROVED" ||
    application.status === "APPROVED" ||
    application.status === "DISBURSED" ||
    application.status === "REJECTED";

  return (
    <div className="space-y-6">
      {/* Loan Parameters Card */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Loan Requirement & Tenure
            </h3>
          </div>
          <span className="text-xs text-[var(--text-faint)]">
            FR-01: Loan Intake Specification
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="loan-amount-slider"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Requested Loan Amount
              </label>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                {formatINR(application.loanRequest.amount)}
              </span>
            </div>
            <input
              id="loan-amount-slider"
              type="range"
              min={100000}
              max={5000000}
              step={25000}
              disabled={isFormLocked || isEvaluating}
              value={application.loanRequest.amount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--bg-muted)] accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-faint)]">
              <span>₹1 Lakh</span>
              <span>₹25 Lakh</span>
              <span>₹50 Lakh</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Repayment Tenure
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[12, 24, 36, 48, 60].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isFormLocked || isEvaluating}
                  onClick={() => handleTenureChange(t)}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    application.loanRequest.tenureMonths === t
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                  }`}
                >
                  {t} Months
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="loan-purpose-select"
              className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]"
            >
              Loan Purpose
            </label>
            <select
              id="loan-purpose-select"
              disabled={isFormLocked || isEvaluating}
              value={application.loanRequest.purpose}
              onChange={(e) =>
                handlePurposeChange(e.target.value as LoanPurpose)
              }
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-hidden"
            >
              <option value="HOME_RENOVATION">
                Home Renovation & Improvement
              </option>
              <option value="WORKING_CAPITAL">Business Working Capital</option>
              <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
              <option value="EDUCATION">Higher Education</option>
              <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applicant Profile Card */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Applicant Profile & Financials
            </h3>
          </div>
          <span className="text-xs text-[var(--text-faint)]">
            FR-01: KYC Identity Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="applicant-full-name"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Full Legal Name
            </label>
            <input
              id="applicant-full-name"
              type="text"
              readOnly
              value={application.applicant.fullName}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-primary)] font-medium"
            />
          </div>

          <div>
            <label
              htmlFor="applicant-dob"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Date of Birth
            </label>
            <input
              id="applicant-dob"
              type="text"
              readOnly
              value={application.applicant.dob}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-primary)] font-medium"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="applicant-tax-id"
                className="text-xs font-medium text-[var(--text-muted)]"
              >
                Permanent Account Number (PAN)
              </label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                Verified Format
              </span>
            </div>
            <div className="relative">
              <CreditCard className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
              <input
                id="applicant-tax-id"
                type="text"
                readOnly
                value={application.applicant.taxId}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] py-2 pr-3 pl-8 text-xs font-mono text-[var(--text-primary)] font-semibold"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="applicant-employment-type"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Employment Type
            </label>
            <div className="relative">
              <Briefcase className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[var(--text-faint)]" />
              <select
                id="applicant-employment-type"
                disabled={isFormLocked || isEvaluating}
                value={application.applicant.employmentType}
                onChange={(e) =>
                  onUpdateApplication({
                    ...application,
                    applicant: {
                      ...application.applicant,
                      employmentType: e.target.value as EmploymentType,
                    },
                  })
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2 pr-3 pl-8 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-hidden"
              >
                <option value="SALARIED">
                  Salaried Corporate Professional
                </option>
                <option value="SELF_EMPLOYED">
                  Self-Employed / SME Business
                </option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="applicant-declared-income"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Declared Net Monthly Income (₹)
            </label>
            <input
              id="applicant-declared-income"
              type="text"
              readOnly
              value={formatINR(application.applicant.declaredMonthlyIncome)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
            />
          </div>
        </div>
      </div>

      {/* Document Bundle Checklist (ADK ArtifactService) */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Document Artifacts (ADK ArtifactService)
            </h3>
          </div>
          <span className="text-xs text-[var(--text-faint)]">
            FR-02: Multimodal Input Artifacts
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* PAN Card Document */}
          <button
            type="button"
            onClick={() => !isFormLocked && toggleDoc("panCard")}
            className={`flex w-full text-left cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
              docUploads.panCard
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300"
                : "border-[var(--border-subtle)] bg-[var(--bg-muted)] opacity-60"
            }`}
          >
            <div className="mt-0.5">
              {docUploads.panCard ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileText className="h-4 w-4 text-[var(--text-faint)]" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold">Government PAN Card</div>
              <div className="text-[10px] text-[var(--text-faint)]">
                {docUploads.panCard
                  ? "pan_card_front.jpg (1.2 MB)"
                  : "Missing document"}
              </div>
              <div className="mt-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                Artifact ID: art-pan-01
              </div>
            </div>
          </button>

          {/* Bank Statement */}
          <button
            type="button"
            onClick={() => !isFormLocked && toggleDoc("bankStatement")}
            className={`flex w-full text-left cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
              docUploads.bankStatement
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300"
                : "border-[var(--border-subtle)] bg-[var(--bg-muted)] opacity-60"
            }`}
          >
            <div className="mt-0.5">
              {docUploads.bankStatement ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileText className="h-4 w-4 text-[var(--text-faint)]" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold">6M Bank Statement</div>
              <div className="text-[10px] text-[var(--text-faint)]">
                {docUploads.bankStatement
                  ? "bank_stmt_6m.pdf (4.8 MB)"
                  : "Missing document"}
              </div>
              <div className="mt-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                Artifact ID: art-bank-02
              </div>
            </div>
          </button>

          {/* Salary Slip */}
          <button
            type="button"
            onClick={() => !isFormLocked && toggleDoc("salarySlip")}
            className={`flex w-full text-left cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
              docUploads.salarySlip
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300"
                : "border-[var(--border-subtle)] bg-[var(--bg-muted)] opacity-60"
            }`}
          >
            <div className="mt-0.5">
              {docUploads.salarySlip ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileText className="h-4 w-4 text-[var(--text-faint)]" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold">Salary Slips / P&L</div>
              <div className="text-[10px] text-[var(--text-faint)]">
                {docUploads.salarySlip
                  ? "salary_slips_3m.pdf (2.1 MB)"
                  : "Optional/Missing"}
              </div>
              <div className="mt-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                Artifact ID: art-pay-03
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Submission Action Bar */}
      {!isFormLocked && (
        <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div>
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Ready to Underwrite with Google ADK
            </div>
            <p className="text-[11px] text-[var(--text-faint)]">
              Will orchestrate SequentialAgent with parallel KYC, document
              spreading, and A2A Credit Bureau pull
            </p>
          </div>

          <button
            type="button"
            disabled={isEvaluating}
            onClick={onSubmitForEvaluation}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running Underwriting Pipeline...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Run Autonomous Underwriting</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
