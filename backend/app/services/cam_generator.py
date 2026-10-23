"""Credit Assessment Memo (CAM) Synthesizer Service.

Synthesizes structured, explainable Credit Assessment Memos (CAM)
using Google GenAI (gemini-3.8-flash) with structured schema output,
with deterministic analytical fallback.
"""

import logging

from app.config import settings
from app.models.domain import (
    ApplicantProfile,
    ApplicationStatus,
    CounterOffer,
    CreditAssessmentMemo,
    LoanRequest,
    PolicyRuleResult,
    RuleOutcome,
    UnderwritingMetrics,
)

logger = logging.getLogger(__name__)


def generate_deterministic_cam(
    applicant: ApplicantProfile,
    loan_request: LoanRequest,
    metrics: UnderwritingMetrics,
    policy_rules: list[PolicyRuleResult],
    routing_status: ApplicationStatus,
    counter_offer: CounterOffer | None = None,
) -> CreditAssessmentMemo:
    """Generates an explainable structured Credit Assessment Memo deterministically."""
    strengths: list[str] = []
    risk_flags: list[str] = []
    mitigants: list[str] = []

    # Analyze strengths
    if metrics.bureau_score >= 750:
        strengths.append(
            f"Strong credit bureau score of {metrics.bureau_score}, demonstrating disciplined debt servicing history."
        )
    if metrics.inward_bounces_6m == 0:
        strengths.append("Zero dishonored checks/inward bounces over the last 6 months.")
    if metrics.dpd_90_plus_24m == 0 and metrics.dpd_30_60_24m == 0:
        strengths.append("Flawless 24-month repayment record with 0 DPD delinquencies.")
    if metrics.average_monthly_balance >= (metrics.verified_monthly_income * 0.3):
        strengths.append(
            f"Healthy banking liquidity with Average Monthly Balance (AMB) of ₹{metrics.average_monthly_balance:,.0f}."
        )

    # Analyze risks
    if metrics.foir_percentage > 45.0:
        risk_flags.append(
            f"Proposed loan results in an elevated FOIR of {metrics.foir_percentage:.2f}% "
            f"(benchmark threshold is 45.0%)."
        )
    if metrics.income_variance_pct > 10.0:
        risk_flags.append(
            f"Income variance of {metrics.income_variance_pct:.1f}% between declared and document-verified income."
        )
    if metrics.bureau_score < 680:
        risk_flags.append(
            f"Sub-prime bureau score of {metrics.bureau_score} indicates high probability of default."
        )
    if metrics.dpd_90_plus_24m > 0:
        risk_flags.append(
            f"Severe delinquency flag: {metrics.dpd_90_plus_24m} trade lines with 90+ Days Past Due (DPD) in last 24m."
        )
    if metrics.inward_bounces_6m >= 2:
        risk_flags.append(
            f"Multiple check bounces ({metrics.inward_bounces_6m}) indicating recurring cash flow distress."
        )

    # Analyze mitigants
    if counter_offer:
        mitigants.append(
            f"AI Counter-Offer structured: Reducing principal to ₹{counter_offer.recommended_amount:,.0f} "
            f"at {counter_offer.recommended_tenure_months} months moderates projected FOIR to {counter_offer.projected_foir:.2f}%."
        )
    if applicant.employment_type == "SALARIED" and metrics.inward_bounces_6m == 0:
        mitigants.append(
            "Predictable salaried employment with established corporate employer and clean salary credits."
        )

    if not mitigants and routing_status == ApplicationStatus.REJECTED:
        mitigants.append("No viable financial mitigants identified to overcome knockout criteria.")

    # Executive Summary & Justification
    if routing_status == ApplicationStatus.AUTO_APPROVED:
        exec_summary = (
            f"The application for {applicant.full_name} meets all Straight-Through Processing (STP) "
            f"credit policy benchmarks. High credit score ({metrics.bureau_score}), clean repayment history, "
            f"and comfortable FOIR of {metrics.foir_percentage:.2f}% qualify for immediate automated sanction."
        )
        recommendation = (
            f"Recommended for Straight-Through Approval at Tier-1 pricing of {metrics.annual_interest_rate_pct:.1f}% APR. "
            f"Sanction letter and Key Fact Statement (KFS) generated automatically."
        )
    elif routing_status == ApplicationStatus.MANUAL_REVIEW:
        if counter_offer:
            exec_summary = (
                f"Application for {applicant.full_name} demonstrates good underlying creditworthiness "
                f"(Bureau {metrics.bureau_score}), but requested loan of ₹{loan_request.amount:,.0f} "
                f"pushes FOIR to {metrics.foir_percentage:.2f}%. An automated Counter-Offer has been formulated."
            )
            recommendation = (
                f"Recommended for Underwriter Approval with Counter-Offer: Sanction revised amount of "
                f"₹{counter_offer.recommended_amount:,.0f} over {counter_offer.recommended_tenure_months} months "
                f"at {metrics.annual_interest_rate_pct:.1f}% APR to ensure debt service sustainability (FOIR {counter_offer.projected_foir:.2f}%)."
            )
        else:
            exec_summary = (
                f"Application for {applicant.full_name} triggered policy review thresholds. "
                f"Requires manual credit officer assessment of banking habits and employer stability."
            )
            recommendation = "Refer to Senior Credit Underwriter for exception approval and manual income verification."
    else:
        failed_rules = [r.metric_name for r in policy_rules if r.outcome == RuleOutcome.AUTO_REJECT]
        exec_summary = (
            f"Application for {applicant.full_name} declined due to multiple hard credit policy knockouts: "
            f"{', '.join(failed_rules)}."
        )
        recommendation = (
            "Reject application in accordance with Credit Policy Manual. Issue Adverse Action Notice "
            "with statutory disclosure of rejection codes."
        )

    return CreditAssessmentMemo(
        executive_summary=exec_summary,
        strengths=strengths,
        risk_flags=risk_flags,
        mitigants=mitigants,
        recommendationJustification=recommendation,
    )


async def synthesize_credit_assessment_memo(
    applicant: ApplicantProfile,
    loan_request: LoanRequest,
    metrics: UnderwritingMetrics,
    policy_rules: list[PolicyRuleResult],
    routing_status: ApplicationStatus,
    counter_offer: CounterOffer | None = None,
) -> CreditAssessmentMemo:
    """Attempts LLM synthesis with Gemini (gemini-3.8-flash) or falls back to deterministic CAM."""
    try:
        from google import genai

        client_kwargs = {}
        if settings.google_genai_use_vertexai:
            client_kwargs["vertexai"] = True
            client_kwargs["project"] = settings.gcp_project
            client_kwargs["location"] = settings.gcp_location
        elif settings.gemini_api_key:
            client_kwargs["api_key"] = settings.gemini_api_key

        if client_kwargs:
            client = genai.Client(**client_kwargs)
            rules_summary = "\n".join(
                [
                    f"- {r.rule_id} ({r.metric_name}): {r.actual_value} -> {r.outcome}"
                    for r in policy_rules
                ]
            )
            prompt = (
                f"You are an enterprise Credit Assessment Memo (CAM) synthesizer agent for a bank.\n"
                f"Synthesize an executive-ready Credit Assessment Memo for:\n"
                f"Applicant: {applicant.full_name}, Age: {metrics.applicant_age_years}, "
                f"Income: ₹{metrics.verified_monthly_income:,.0f}, Employment: {applicant.employment_type}.\n"
                f"Loan Requested: ₹{loan_request.amount:,.0f} for {loan_request.tenure_months} months.\n"
                f"Metrics: Bureau Score: {metrics.bureau_score}, FOIR: {metrics.foir_percentage:.2f}%, "
                f"Bounces: {metrics.inward_bounces_6m}, 90+ DPD: {metrics.dpd_90_plus_24m}.\n"
                f"Policy Rule Results:\n{rules_summary}\n"
                f"Routing Outcome: {routing_status}.\n"
                f"Counter Offer: {counter_offer.model_dump() if counter_offer else 'None'}.\n"
                f"Provide structured executive_summary, strengths, risk_flags, mitigants, and recommendationJustification."
            )
            response = client.models.generate_content(
                model=settings.model_name,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": CreditAssessmentMemo,
                },
            )
            if response.parsed:
                return response.parsed
    except Exception as e:
        logger.info(f"Gemini CAM synthesis fallback triggered: {e}")

    return generate_deterministic_cam(
        applicant=applicant,
        loan_request=loan_request,
        metrics=metrics,
        policy_rules=policy_rules,
        routing_status=routing_status,
        counter_offer=counter_offer,
    )
