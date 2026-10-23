"""ADK Multi-Agent Underwriting Pipeline Architecture.

TRD-ADK-01:
- Root Orchestrator: `los_orchestrator_agent` (SequentialAgent)
  - Stage 1: `parallel_verification_stage` (ParallelAgent)
    - `kyc_fraud_agent` (LlmAgent)
    - `financial_spreading_agent` (LlmAgent)
    - `credit_bureau_a2a_bridge` (LlmAgent + A2A JSON-RPC)
  - Stage 2: `deterministic_policy_agent` (LlmAgent + Deterministic FunctionTools)
    - `compute_financial_ratios_tool`
    - `evaluate_credit_policy_tool`
  - Stage 3: `cam_synthesizer_agent` (LlmAgent)
    - `synthesize_cam_and_offer_tool`
"""

from datetime import date

from app.a2a.bureau_server import execute_bureau_a2a_call
from app.adk_engine import (
    Agent,
    App,
    FunctionTool,
    ParallelAgent,
    ResumabilityConfig,
    SequentialAgent,
    ToolContext,
)
from app.callbacks import (
    audit_after_tool_callback,
    init_los_session_callback,
    mask_pii_before_model_callback,
)
from app.config import settings
from app.models.domain import (
    ApplicationStatus,
    UnderwritingMetrics,
)
from app.services.cam_generator import synthesize_credit_assessment_memo
from app.services.document_parser import extract_document_intelligence
from app.services.financial_calculator import (
    compute_counter_offer,
    compute_foir,
    compute_income_variance_pct,
    compute_interest_rate_tier,
    compute_monthly_emi,
    generate_kfs,
)
from app.services.kyc_service import run_kyc_verification
from app.services.policy_engine import evaluate_credit_policy

# ==============================================================================
# Deterministic Function Tools
# ==============================================================================


async def run_kyc_verification_tool(tool_context: ToolContext):
    """Tool: Runs fuzzy name matching, DOB, and Tax ID verification against document extraction."""
    state = tool_context.state
    applicant = state["applicant"]
    persona_id = state.get("persona_id")

    # If document spreading has already parsed or will parse, obtain extraction
    doc_res = state.get("document_extraction")
    if not doc_res:
        doc_res = await extract_document_intelligence(
            persona_id=persona_id,
            declared_name=applicant.full_name,
            declared_dob=applicant.dob,
            declared_tax_id=applicant.tax_id,
            declared_income=applicant.declared_monthly_income,
        )
        state["document_extraction"] = doc_res

    # Bureau watchlist check (from bureau result if available, else False)
    bureau_res = state.get("bureau_report")
    watchlist_hit = getattr(bureau_res, "watchlist_hit", False) if bureau_res else False

    kyc_result = run_kyc_verification(
        declared_name=applicant.full_name,
        declared_dob=applicant.dob,
        declared_tax_id=applicant.tax_id,
        extracted_name=doc_res.extracted_name,
        extracted_dob=doc_res.extracted_dob,
        extracted_tax_id=doc_res.extracted_tax_id,
        watchlist_hit_bureau=watchlist_hit,
    )
    state["kyc_result"] = kyc_result
    return kyc_result


async def run_document_spreading_tool(tool_context: ToolContext):
    """Tool: Multimodal bank statement and income spreading to calculate AMB, EMI, and bounces."""
    state = tool_context.state
    applicant = state["applicant"]
    persona_id = state.get("persona_id")

    doc_res = await extract_document_intelligence(
        persona_id=persona_id,
        declared_name=applicant.full_name,
        declared_dob=applicant.dob,
        declared_tax_id=applicant.tax_id,
        declared_income=applicant.declared_monthly_income,
    )
    state["document_extraction"] = doc_res
    return doc_res


async def invoke_remote_bureau_a2a_tool(tool_context: ToolContext) -> dict:
    """Tool: Invocates the federated Credit Bureau Agent over the A2A Protocol."""
    state = tool_context.state
    applicant = state["applicant"]

    bureau_report, watchlist_hit, exchange_record = await execute_bureau_a2a_call(
        tax_id=applicant.tax_id,
        applicant_name=applicant.full_name,
        caller_agent_name="los_orchestrator_agent::credit_bureau_a2a_bridge",
    )

    state["bureau_report"] = bureau_report
    if "a2a_telemetry" not in state:
        state["a2a_telemetry"] = []
    state["a2a_telemetry"].append(exchange_record)

    return {
        "bureau_report": bureau_report.model_dump(),
        "watchlist_hit": watchlist_hit,
        "exchange_id": exchange_record.exchange_id,
    }


def compute_financial_ratios_tool(tool_context: ToolContext) -> dict:
    """Tool: Deterministic computation of EMI, FOIR, APR Tier, and Counter-Offer optimization."""
    state = tool_context.state
    applicant = state["applicant"]
    loan_req = state["loan_request"]
    doc_res = state["document_extraction"]
    bureau_res = state["bureau_report"]

    today = date.today()
    age = (
        today.year
        - applicant.dob.year
        - ((today.month, today.day) < (applicant.dob.month, applicant.dob.day))
    )

    apr_pct = compute_interest_rate_tier(bureau_res.bureau_score)
    proposed_emi = compute_monthly_emi(loan_req.amount, apr_pct, loan_req.tenure_months)
    foir = compute_foir(doc_res.existing_emi_outflow, proposed_emi, doc_res.verified_monthly_income)
    variance_pct = compute_income_variance_pct(
        applicant.declared_monthly_income, doc_res.verified_monthly_income
    )

    metrics = UnderwritingMetrics(
        applicant_age_years=age,
        bureau_score=bureau_res.bureau_score,
        declared_monthly_income=applicant.declared_monthly_income,
        verified_monthly_income=doc_res.verified_monthly_income,
        income_variance_pct=variance_pct,
        average_monthly_balance=doc_res.average_monthly_balance,
        existing_emi_outflow=doc_res.existing_emi_outflow,
        proposed_emi=proposed_emi,
        annual_interest_rate_pct=apr_pct,
        foir_percentage=foir,
        inward_bounces_6m=doc_res.inward_bounces_6m,
        dpd_30_60_24m=bureau_res.dpd_30_60_24m,
        dpd_90_plus_24m=bureau_res.dpd_90_plus_24m,
    )
    state["underwriting_metrics"] = metrics

    # Compute counter offer if FOIR is high
    counter_offer = compute_counter_offer(
        requested_amount=loan_req.amount,
        requested_tenure=loan_req.tenure_months,
        bureau_score=bureau_res.bureau_score,
        existing_emi_outflow=doc_res.existing_emi_outflow,
        verified_monthly_income=doc_res.verified_monthly_income,
        target_foir_pct=48.0,
    )
    state["counter_offer"] = counter_offer

    return {
        "metrics": metrics.model_dump(),
        "counter_offer": counter_offer.model_dump() if counter_offer else None,
    }


def evaluate_credit_policy_tool(tool_context: ToolContext) -> dict:
    """Tool: Evaluates credit policy rules POL-01 through POL-06 and determines application status."""
    state = tool_context.state
    metrics: UnderwritingMetrics = state["underwriting_metrics"]
    counter_offer = state.get("counter_offer")

    status, rules, adverse_codes = evaluate_credit_policy(metrics, counter_offer)
    state["status"] = status
    state["policy_rules"] = rules
    state["adverse_action_codes"] = adverse_codes

    return {
        "routing_status": status,
        "rule_count": len(rules),
        "adverse_action_codes": adverse_codes,
    }


async def synthesize_cam_and_offer_tool(tool_context: ToolContext) -> dict:
    """Tool: Synthesizes Credit Assessment Memo (CAM) and Key Fact Statement (KFS)."""
    state = tool_context.state
    applicant = state["applicant"]
    loan_req = state["loan_request"]
    metrics: UnderwritingMetrics = state["underwriting_metrics"]
    rules = state["policy_rules"]
    status: ApplicationStatus = state["status"]
    counter_offer = state.get("counter_offer")

    # Generate CAM
    cam = await synthesize_credit_assessment_memo(
        applicant=applicant,
        loan_request=loan_req,
        metrics=metrics,
        policy_rules=rules,
        routing_status=status,
        counter_offer=counter_offer,
    )
    state["credit_memo"] = cam

    # Generate KFS for AUTO_APPROVED cases
    kfs = None
    if status == ApplicationStatus.AUTO_APPROVED:
        kfs = generate_kfs(
            amount=loan_req.amount,
            tenure_months=loan_req.tenure_months,
            apr_pct=metrics.annual_interest_rate_pct,
        )
        state["key_fact_statement"] = kfs

    return {
        "cam_summary": cam.executive_summary,
        "kfs_generated": kfs is not None,
    }


# ==============================================================================
# ADK Agent Hierarchy & Factories
# ==============================================================================


def create_kyc_fraud_agent() -> Agent:
    return Agent(
        name="kyc_fraud_agent",
        model=settings.model_name,
        description="Extracts KYC identity attributes from uploaded ID artifacts and runs fuzzy match & watchlist checks.",
        instruction=(
            "You are the KYC & Fraud Verification Agent. Call `run_kyc_verification_tool` "
            "to inspect uploaded identity artifacts in session state and verify identity & watchlist status."
        ),
        tools=[FunctionTool(run_kyc_verification_tool)],
        output_key="kyc_result",
        before_model_callback=mask_pii_before_model_callback,
        after_tool_callback=audit_after_tool_callback,
    )


def create_financial_spreading_agent() -> Agent:
    return Agent(
        name="financial_spreading_agent",
        model=settings.model_name,
        description="Extracts bank statement cashflows, AMB, existing EMIs, check bounces, and income variance.",
        instruction=(
            "You are the Financial Spreading Agent. Call `run_document_spreading_tool` "
            "to parse uploaded bank statement and income artifacts into verified financial metrics."
        ),
        tools=[FunctionTool(run_document_spreading_tool)],
        output_key="document_spread_result",
        before_model_callback=mask_pii_before_model_callback,
        after_tool_callback=audit_after_tool_callback,
    )


def create_bureau_a2a_bridge_agent() -> Agent:
    return Agent(
        name="credit_bureau_a2a_bridge",
        model=settings.model_name,
        description="Delegates credit bureau score, tradeline, and DPD retrieval to the remote Credit Bureau Agent over A2A.",
        instruction=(
            "Call `invoke_remote_bureau_a2a_tool` to query the external Credit Bureau A2A agent "
            "via its AgentCard and JSON-RPC task endpoint."
        ),
        tools=[FunctionTool(invoke_remote_bureau_a2a_tool)],
        output_key="bureau_result",
        after_tool_callback=audit_after_tool_callback,
    )


def create_deterministic_policy_agent() -> Agent:
    return Agent(
        name="deterministic_policy_agent",
        model=settings.model_name,
        description="Executes deterministic EMI, FOIR, Counter-Offer optimization, and POL-01..POL-06 credit policy rules.",
        instruction=(
            "You are the Deterministic Policy Engine Coordinator. Never perform arithmetic yourself. "
            "First call `compute_financial_ratios_tool`, then call `evaluate_credit_policy_tool`."
        ),
        tools=[
            FunctionTool(compute_financial_ratios_tool),
            FunctionTool(evaluate_credit_policy_tool),
        ],
        output_key="policy_evaluation_summary",
        after_tool_callback=audit_after_tool_callback,
    )


def create_cam_synthesizer_agent() -> Agent:
    return Agent(
        name="cam_synthesizer_agent",
        model=settings.model_name,
        description="Synthesizes the structured Credit Assessment Memo (CAM) and prepares KFS or HITL Manual Review gate.",
        instruction=(
            "Call `synthesize_cam_and_offer_tool` to generate the explainable Credit Assessment Memo (CAM), "
            "Key Fact Statement (KFS) for STP approvals, or trigger the HITL Manual Review pause."
        ),
        tools=[FunctionTool(synthesize_cam_and_offer_tool)],
        output_key="cam_result",
        after_tool_callback=audit_after_tool_callback,
    )


def create_los_root_agent() -> SequentialAgent:
    parallel_verification_stage = ParallelAgent(
        name="parallel_verification_stage",
        description="Concurrently runs KYC verification, Financial Document Spreading, and A2A Credit Bureau pull.",
        sub_agents=[
            create_kyc_fraud_agent(),
            create_financial_spreading_agent(),
            create_bureau_a2a_bridge_agent(),
        ],
    )
    return SequentialAgent(
        name="los_orchestrator_agent",
        description="End-to-end Retail & SME Loan Origination System (LOS) multi-agent underwriting pipeline.",
        sub_agents=[
            parallel_verification_stage,
            create_deterministic_policy_agent(),
            create_cam_synthesizer_agent(),
        ],
        before_agent_callback=init_los_session_callback,
    )


root_agent = create_los_root_agent()
app = App(
    name="app",
    root_agent=root_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)
