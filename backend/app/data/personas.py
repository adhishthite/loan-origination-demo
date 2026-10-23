"""Pre-baked demo personas and sample document bundles for the LOS demo."""

from datetime import date

from app.models.api import DemoPersonaPreset, DocumentUploadItem
from app.models.domain import (
    ApplicantProfile,
    ApplicationStatus,
    EmploymentType,
    LoanPurpose,
    LoanRequest,
)

PERSONA_STP_CLEAN = DemoPersonaPreset(
    id="persona_stp_clean",
    name="Ananya Kulkarni",
    subtitle="Salaried Senior Tech Lead • Clean STP Track",
    badge="AUTO-APPROVE (STP)",
    badge_variant="success",
    description="Tier-1 salaried professional with excellent credit (792), zero bounces, low FOIR (18%), and matching KYC.",
    applicant=ApplicantProfile(
        full_name="Ananya Kulkarni",
        dob=date(1994, 6, 12),  # Age 32
        tax_id="ABCDE1234F",
        employment_type=EmploymentType.SALARIED,
        declared_monthly_income=145000.0,
    ),
    loan_request=LoanRequest(
        amount=800000.0,
        tenure_months=36,
        purpose=LoanPurpose.HOME_RENOVATION,
    ),
    expected_outcome=ApplicationStatus.AUTO_APPROVED,
    expected_summary="Straight-Through Processing (< 5s), 10.5% APR, zero review flags, immediate KFS generation.",
    document_bundle=[
        DocumentUploadItem(
            doc_type="ID_PROOF",
            file_name="Ananya_Kulkarni_PAN_Card.pdf",
            mime_type="application/pdf",
            content_summary="Income Tax Department PAN Card. Name: Ananya Kulkarni, DOB: 12/06/1994, PAN: ABCDE1234F. Clear, tamper-free.",
        ),
        DocumentUploadItem(
            doc_type="SALARY_SLIP",
            file_name="Ananya_SalarySlips_Q3_2026.pdf",
            mime_type="application/pdf",
            content_summary="Net Pay: ₹1,45,000/month. Employer: Alphabet India Pvt Ltd. Direct credit to HDFC Bank.",
        ),
        DocumentUploadItem(
            doc_type="BANK_STATEMENT",
            file_name="Ananya_HDFC_Statement_6M.pdf",
            mime_type="application/pdf",
            content_summary="6 Months Salary Account Statement. Average Monthly Balance: ₹85,000. Inward bounces: 0. Existing EMI debits: ₹0.",
        ),
    ],
)

PERSONA_GREY_COUNTER = DemoPersonaPreset(
    id="persona_grey_counter",
    name="Rohan Deshmukh",
    subtitle="Salaried Marketing Lead • Canonical Grey-Zone",
    badge="MANUAL REVIEW + COUNTER-OFFER",
    badge_variant="warning",
    description="Solid profile (Bureau 732, 0 DPD, 0 bounces), but high requested amount (₹15L) pushes FOIR to 59%, triggering AI Counter-Offer.",
    applicant=ApplicantProfile(
        full_name="Rohan Deshmukh",
        dob=date(1991, 4, 15),  # Age 35
        tax_id="ABCDE5678G",
        employment_type=EmploymentType.SALARIED,
        declared_monthly_income=120000.0,
    ),
    loan_request=LoanRequest(
        amount=1500000.0,
        tenure_months=36,
        purpose=LoanPurpose.HOME_RENOVATION,
    ),
    expected_outcome=ApplicationStatus.MANUAL_REVIEW,
    expected_summary="Bureau 732 (13.5% APR) & FOIR 59% exceeds 55% cap. Automated counter-offer generated (₹11.5L @ 48m, FOIR ~43-47%) for underwriter decision.",
    document_bundle=[
        DocumentUploadItem(
            doc_type="ID_PROOF",
            file_name="Rohan_Deshmukh_PAN.pdf",
            mime_type="application/pdf",
            content_summary="Income Tax Department PAN Card. Name: Rohan Deshmukh, DOB: 15/04/1991, PAN: ABCDE5678G.",
        ),
        DocumentUploadItem(
            doc_type="SALARY_SLIP",
            file_name="Rohan_Salary_Slips_Recent.pdf",
            mime_type="application/pdf",
            content_summary="Net Pay: ₹1,15,000/month. Employer: FinTech Media Solutions. Minor variance of 4.2% vs declared ₹1,20,000.",
        ),
        DocumentUploadItem(
            doc_type="BANK_STATEMENT",
            file_name="Rohan_ICICI_Statement_6M.pdf",
            mime_type="application/pdf",
            content_summary="6 Months ICICI Bank Statement. AMB: ₹52,000. Existing auto loan EMI: ₹18,000/month. Inward bounces: 0.",
        ),
    ],
)

PERSONA_REJECT_KNOCKOUT = DemoPersonaPreset(
    id="persona_reject_knockout",
    name="Vikramaditya Joshi",
    subtitle="Self-Employed SME Owner • Hard Knockouts",
    badge="AUTO-REJECT (KNOCKOUT)",
    badge_variant="destructive",
    description="Multiple policy knockout breaches: low credit score (615), 2 severe 90+ DPD delinquencies, 3 check bounces, and 45% income inflation.",
    applicant=ApplicantProfile(
        full_name="Vikramaditya Joshi",
        dob=date(1985, 2, 10),  # Age 41
        tax_id="ABCDE9012H",
        employment_type=EmploymentType.SELF_EMPLOYED,
        declared_monthly_income=200000.0,
    ),
    loan_request=LoanRequest(
        amount=2500000.0,
        tenure_months=24,
        purpose=LoanPurpose.WORKING_CAPITAL,
    ),
    expected_outcome=ApplicationStatus.REJECTED,
    expected_summary="Instant automated rejection with Adverse Action Notice codes (ERR_BUREAU_SCORE_LOW, ERR_BUREAU_DELINQUENCY_HIGH, ERR_BANK_BOUNCES_HIGH, ERR_INCOME_VARIANCE_CRITICAL).",
    document_bundle=[
        DocumentUploadItem(
            doc_type="ID_PROOF",
            file_name="Vikram_Joshi_PAN_Card.pdf",
            mime_type="application/pdf",
            content_summary="PAN Card: Vikramaditya Joshi, DOB: 10/02/1985, PAN: ABCDE9012H.",
        ),
        DocumentUploadItem(
            doc_type="SALARY_SLIP",
            file_name="Vikram_ITR_GST_Filings.pdf",
            mime_type="application/pdf",
            content_summary="ITR & GST returns verify monthly cashflow of ₹1,10,000 (declared ₹2,00,000 - 45% variance!).",
        ),
        DocumentUploadItem(
            doc_type="BANK_STATEMENT",
            file_name="Vikram_CurrentAccount_6M.pdf",
            mime_type="application/pdf",
            content_summary="Current Account Statement: AMB: ₹12,000. 3 inward check bounces in last 6 months. Existing equipment EMI: ₹45,000/month.",
        ),
    ],
)

ALL_PERSONAS: dict[str, DemoPersonaPreset] = {
    PERSONA_STP_CLEAN.id: PERSONA_STP_CLEAN,
    PERSONA_GREY_COUNTER.id: PERSONA_GREY_COUNTER,
    PERSONA_REJECT_KNOCKOUT.id: PERSONA_REJECT_KNOCKOUT,
}
