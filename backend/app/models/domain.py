"""Core domain models for the Loan Origination System (Pydantic v2)."""

from datetime import UTC, date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


def get_utc_now() -> datetime:
    return datetime.now(UTC)


def mask_tax_id(tax_id: str) -> str:
    """Masks a PAN/Tax ID to standard format XXXXX1234F."""
    if len(tax_id) == 10:
        return f"XXXXX{tax_id[5:]}"
    return tax_id


class ApplicationStatus(StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    KYC_VERIFICATION = "KYC_VERIFICATION"
    UNDERWRITING = "UNDERWRITING"
    AUTO_APPROVED = "AUTO_APPROVED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    APPROVED = "APPROVED"
    OFFER_GENERATED = "OFFER_GENERATED"
    DISBURSED = "DISBURSED"
    REJECTED = "REJECTED"


class EmploymentType(StrEnum):
    SALARIED = "SALARIED"
    SELF_EMPLOYED = "SELF_EMPLOYED"


class LoanPurpose(StrEnum):
    HOME_RENOVATION = "HOME_RENOVATION"
    WORKING_CAPITAL = "WORKING_CAPITAL"
    DEBT_CONSOLIDATION = "DEBT_CONSOLIDATION"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    EDUCATION = "EDUCATION"


class RuleOutcome(StrEnum):
    AUTO_APPROVE = "AUTO_APPROVE"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    AUTO_REJECT = "AUTO_REJECT"


class ApplicantProfile(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    dob: date
    tax_id: str = Field(..., pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
    employment_type: EmploymentType
    declared_monthly_income: float = Field(..., gt=0)


class LoanRequest(BaseModel):
    amount: float = Field(..., ge=100_000, le=5_000_000)  # ₹1L to ₹50L
    tenure_months: int = Field(..., ge=12, le=60)
    purpose: LoanPurpose


class DocumentExtractionResult(BaseModel):
    extracted_name: str
    extracted_dob: date
    extracted_tax_id: str
    id_confidence_score: float = Field(..., ge=0.0, le=1.0)
    average_monthly_balance: float = Field(..., ge=0)
    verified_monthly_income: float = Field(..., gt=0)
    existing_emi_outflow: float = Field(..., ge=0)
    inward_bounces_6m: int = Field(..., ge=0)
    tamper_flags: list[str] = Field(default_factory=list)


class KYCVerificationResult(BaseModel):
    name_similarity_score: float = Field(..., ge=0.0, le=100.0)
    dob_match: bool
    tax_id_match: bool
    watchlist_hit: bool
    is_existing_customer_delinquent: bool
    kyc_passed: bool
    failure_reasons: list[str] = Field(default_factory=list)


class BureauReport(BaseModel):
    bureau_score: int = Field(..., ge=300, le=900)
    active_tradelines: int = Field(..., ge=0)
    dpd_30_60_24m: int = Field(..., ge=0)
    dpd_90_plus_24m: int = Field(..., ge=0)
    recent_inquiries_6m: int = Field(..., ge=0)


class UnderwritingMetrics(BaseModel):
    applicant_age_years: int
    bureau_score: int
    declared_monthly_income: float
    verified_monthly_income: float
    income_variance_pct: float
    average_monthly_balance: float
    existing_emi_outflow: float
    proposed_emi: float
    annual_interest_rate_pct: float
    foir_percentage: float
    inward_bounces_6m: int
    dpd_30_60_24m: int
    dpd_90_plus_24m: int


class PolicyRuleResult(BaseModel):
    rule_id: str  # POL-01 .. POL-06
    metric_name: str
    actual_value: str
    outcome: RuleOutcome
    threshold_description: str
    adverse_action_code: str | None = None


class CounterOffer(BaseModel):
    recommended_amount: float
    recommended_tenure_months: int
    recommended_emi: float
    projected_foir: float
    rationale: str


class CreditAssessmentMemo(BaseModel):
    executive_summary: str
    strengths: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    mitigants: list[str] = Field(default_factory=list)
    recommendationJustification: str


class KeyFactStatement(BaseModel):
    sanctioned_amount: float
    tenure_months: int
    annual_interest_rate_pct: float
    processing_fee_amount: float  # 1.5% of sanctioned_amount
    effective_apr_pct: float
    monthly_emi: float
    total_interest_payable: float
    total_amount_payable: float


class A2aExchangeRecord(BaseModel):
    exchange_id: str
    timestamp: datetime = Field(default_factory=get_utc_now)
    caller_agent: str
    target_agent: str
    agent_card_url: str
    protocol: str = "A2A-JSON-RPC-2.0"
    request_payload: dict
    response_payload: dict
    latency_ms: float


class AdkAgentStepExecution(BaseModel):
    agent_name: str
    agent_type: str  # "SequentialAgent" | "ParallelAgent" | "LlmAgent" | "RemoteA2aAgent"
    status: str  # "COMPLETED" | "PAUSED_HITL" | "FAILED"
    tool_calls: list[str] = Field(default_factory=list)
    state_keys_written: list[str] = Field(default_factory=list)
    duration_ms: float = 0.0


class AuditLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=get_utc_now)
    actor: str  # "ADK_AGENT:<name>", "A2A_REMOTE:<name>", or credit officer ID
    action: str
    previous_status: ApplicationStatus | None = None
    new_status: ApplicationStatus
    policy_version: str
    details: dict = Field(default_factory=dict)


class StoredDocument(BaseModel):
    doc_id: str
    doc_type: str  # "ID_PROOF", "SALARY_SLIP", "BANK_STATEMENT"
    file_name: str
    uploaded_at: datetime = Field(default_factory=get_utc_now)
    mime_type: str = "application/pdf"
    content_summary: str | None = None


class LoanApplication(BaseModel):
    application_id: str
    status: ApplicationStatus = ApplicationStatus.DRAFT
    applicant: ApplicantProfile
    loan_request: LoanRequest
    persona_id: str | None = None
    documents: list[StoredDocument] = Field(default_factory=list)

    # Underwriting Results
    document_extraction: DocumentExtractionResult | None = None
    kyc_result: KYCVerificationResult | None = None
    bureau_report: BureauReport | None = None
    underwriting_metrics: UnderwritingMetrics | None = None
    policy_rules: list[PolicyRuleResult] = Field(default_factory=list)
    counter_offer: CounterOffer | None = None
    credit_memo: CreditAssessmentMemo | None = None
    key_fact_statement: KeyFactStatement | None = None

    # Telemetry and Governance
    a2a_telemetry: list[A2aExchangeRecord] = Field(default_factory=list)
    agent_steps: list[AdkAgentStepExecution] = Field(default_factory=list)
    audit_log: list[AuditLogEntry] = Field(default_factory=list)

    # Timestamps & eSign
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)
    e_signature: str | None = None
    disbursement_ref: str | None = None
