export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "KYC_VERIFICATION"
  | "UNDERWRITING"
  | "AUTO_APPROVED"
  | "MANUAL_REVIEW"
  | "APPROVED"
  | "OFFER_GENERATED"
  | "DISBURSED"
  | "REJECTED";

export type EmploymentType = "SALARIED" | "SELF_EMPLOYED";

export type LoanPurpose =
  | "HOME_RENOVATION"
  | "WORKING_CAPITAL"
  | "DEBT_CONSOLIDATION"
  | "MEDICAL_EMERGENCY"
  | "EDUCATION";

export type RuleOutcome = "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_REJECT";

export interface ApplicantProfile {
  fullName: string;
  dob: string;
  taxId: string; // PAN (e.g. ABCDE1234F)
  employmentType: EmploymentType;
  declaredMonthlyIncome: number;
  phone?: string;
  email?: string;
}

export interface LoanRequest {
  amount: number;
  tenureMonths: number;
  purpose: LoanPurpose;
}

export interface DocumentExtractionResult {
  extractedName: string;
  extractedDob: string;
  extractedTaxId: string;
  idConfidenceScore: number;
  averageMonthlyBalance: number;
  verifiedMonthlyIncome: number;
  existingEmiOutflow: number;
  inwardBounces6m: number;
  tamperFlags: string[];
}

export interface KYCVerificationResult {
  nameSimilarityScore: number;
  dobMatch: boolean;
  taxIdMatch: boolean;
  watchlistHit: boolean;
  isExistingCustomerDelinquent: boolean;
  kycPassed: boolean;
  failureReasons: string[];
}

export interface BureauReport {
  bureauScore: number;
  activeTradelines: number;
  dpd30To60In24m: number;
  dpd90PlusIn24m: number;
  recentInquiries6m: number;
  bureauProvider: string;
}

export interface UnderwritingMetrics {
  applicantAgeYears: number;
  bureauScore: number;
  declaredMonthlyIncome: number;
  verifiedMonthlyIncome: number;
  incomeVariancePct: number;
  averageMonthlyBalance: number;
  existingEmiOutflow: number;
  proposedEmi: number;
  annualInterestRatePct: number;
  foirPercentage: number;
  inwardBounces6m: number;
  dpd30To60In24m: number;
  dpd90PlusIn24m: number;
}

export interface PolicyRuleResult {
  ruleId: string; // POL-01 .. POL-06
  metricName: string;
  actualValue: string;
  outcome: RuleOutcome;
  thresholdDescription: string;
  adverseActionCode?: string | null;
}

export interface CounterOffer {
  recommendedAmount: number;
  recommendedTenureMonths: number;
  recommendedEmi: number;
  projectedFoir: number;
  rationale: string;
}

export interface CreditAssessmentMemo {
  executiveSummary: string;
  strengths: string[];
  riskFlags: string[];
  mitigants: string[];
  recommendationJustification: string;
}

export interface KeyFactStatement {
  sanctionedAmount: number;
  tenureMonths: number;
  annualInterestRatePct: number;
  processingFeeAmount: number; // 1.5%
  effectiveAprPct: number;
  monthlyEmi: number;
  totalInterestPayable: number;
  totalAmountPayable: number;
  kfsGeneratedAt: string;
}

export interface A2aExchangeRecord {
  exchangeId: string;
  timestamp: string;
  callerAgent: string;
  targetAgent: string;
  agentCardUrl: string;
  protocol: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  latencyMs: number;
}

export interface AdkAgentStepExecution {
  agentName: string;
  agentType:
    | "SequentialAgent"
    | "ParallelAgent"
    | "LlmAgent"
    | "RemoteA2aAgent";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "PAUSED_HITL" | "FAILED";
  toolCalls: string[];
  stateKeysWritten: string[];
  durationMs: number;
}

export interface AuditLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  policyVersion: string;
  details: Record<string, unknown>;
}

export interface LoanApplication {
  id: string;
  personaId?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  applicant: ApplicantProfile;
  loanRequest: LoanRequest;
  documentsUploaded: {
    panCard: boolean;
    bankStatement: boolean;
    salarySlip: boolean;
  };
  documentExtraction?: DocumentExtractionResult;
  kycVerification?: KYCVerificationResult;
  bureauReport?: BureauReport;
  metrics?: UnderwritingMetrics;
  policyRules: PolicyRuleResult[];
  cam?: CreditAssessmentMemo;
  counterOffer?: CounterOffer;
  kfs?: KeyFactStatement;
  adkExecutionSteps: AdkAgentStepExecution[];
  a2aTelemetry: A2aExchangeRecord[];
  auditLog: AuditLogEntry[];
}

export interface DemoPersonaPreset {
  id: string;
  name: string;
  title: string;
  summary: string;
  badge: string;
  badgeColor: "emerald" | "amber" | "rose";
  expectedOutcome: ApplicationStatus;
  applicant: ApplicantProfile;
  loanRequest: LoanRequest;
}

export interface CounterOfferSimulationRequest {
  loanAmount: number;
  tenureMonths: number;
}

export interface CounterOfferSimulationResponse {
  proposedAmount: number;
  proposedTenureMonths: number;
  interestRatePct: number;
  proposedEmi: number;
  foirPct: number;
  foirStatus: RuleOutcome;
  monthlySavings: number;
  isViable: boolean;
}

export interface UnderwriterDecisionRequest {
  decision: "APPROVE" | "APPROVE_COUNTER" | "REJECT";
  counterAmount?: number;
  counterTenure?: number;
  officerNotes: string;
}

export interface AcceptOfferRequest {
  signatureName: string;
  consentTimestamp: string;
}

export interface A2aAgentSkill {
  id: string;
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
}

export interface A2aAgentCard {
  name: string;
  description: string;
  version: string;
  protocol: string;
  url: string;
  endpoints: {
    taskSend: string;
    agentCard: string;
  };
  skills: A2aAgentSkill[];
  governance: {
    adkVersion: string;
    framework: string;
    piiCompliant: boolean;
    fsiStandards: string[];
  };
}
