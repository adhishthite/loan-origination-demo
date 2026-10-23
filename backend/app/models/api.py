"""API Data Transfer Objects (DTOs) for the Loan Origination System."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.models.domain import (
    ApplicantProfile,
    ApplicationStatus,
    EmploymentType,
    LoanRequest,
    PolicyRuleResult,
    mask_tax_id,
)


class CreateApplicationRequest(BaseModel):
    applicant: ApplicantProfile
    loan_request: LoanRequest
    persona_id: str | None = None


class DocumentUploadItem(BaseModel):
    doc_type: str  # ID_PROOF, SALARY_SLIP, BANK_STATEMENT
    file_name: str
    content_base64: str | None = None
    mime_type: str = "application/pdf"
    content_summary: str | None = None


class DocumentBundleRequest(BaseModel):
    documents: list[DocumentUploadItem]


class CounterOfferSimulationRequest(BaseModel):
    proposed_amount: float = Field(..., ge=50_000, le=5_000_000)
    proposed_tenure_months: int = Field(..., ge=12, le=84)


class CounterOfferSimulationResponse(BaseModel):
    proposed_amount: float
    proposed_tenure_months: int
    interest_rate_pct: float
    proposed_emi: float
    projected_foir: float
    is_viable: bool
    policy_rules: list[PolicyRuleResult]
    summary: str


class UnderwriterDecisionRequest(BaseModel):
    decision: str = Field(..., pattern=r"^(APPROVE|APPROVE_COUNTER|REJECT)$")
    officer_id: str = "CREDIT_OFFICER_01"
    notes: str | None = None
    custom_amount: float | None = None
    custom_tenure: int | None = None


class AcceptOfferRequest(BaseModel):
    e_signature: str = Field(..., min_length=2)
    consent_timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ApplicationSummary(BaseModel):
    application_id: str
    applicant_name: str
    masked_tax_id: str
    employment_type: EmploymentType
    amount: float
    tenure_months: int
    status: ApplicationStatus
    bureau_score: int | None = None
    foir_percentage: float | None = None
    created_at: datetime

    @classmethod
    def from_application(cls, app):
        return cls(
            application_id=app.application_id,
            applicant_name=app.applicant.full_name,
            masked_tax_id=mask_tax_id(app.applicant.tax_id),
            employment_type=app.applicant.employment_type,
            amount=app.loan_request.amount,
            tenure_months=app.loan_request.tenure_months,
            status=app.status,
            bureau_score=(
                app.underwriting_metrics.bureau_score if app.underwriting_metrics else None
            ),
            foir_percentage=(
                app.underwriting_metrics.foir_percentage if app.underwriting_metrics else None
            ),
            created_at=app.created_at,
        )


class DemoPersonaPreset(BaseModel):
    id: str
    name: str
    subtitle: str
    badge: str
    badge_variant: str  # success, warning, destructive
    description: str
    applicant: ApplicantProfile
    loan_request: LoanRequest
    expected_outcome: ApplicationStatus
    expected_summary: str
    document_bundle: list[DocumentUploadItem]


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str
    policy_version: str
    model_name: str
    active_gcp_project: str
    adk_status: str = "ACTIVE"
    a2a_bureau_server: str = "RUNNING"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class A2aJsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: dict = Field(default_factory=dict)
    id: str | int = 1


class A2aJsonRpcResponse(BaseModel):
    jsonrpc: str = "2.0"
    result: dict | None = None
    error: dict | None = None
    id: str | int = 1
