"""Inbound LOS Underwriter Root A2A Service.

Exposes the LOS Underwriter Agent Card at:
    GET /a2a/los_underwriter/.well-known/agent-card.json
And the JSON-RPC 2.0 task endpoint at:
    POST /a2a/los_underwriter
"""

from fastapi import APIRouter

from app.config import settings
from app.models.api import A2aJsonRpcRequest, A2aJsonRpcResponse

router = APIRouter(prefix="/a2a/los_underwriter", tags=["A2A LOS Underwriter"])

LOS_UNDERWRITER_AGENT_CARD = {
    "name": "los_underwriter_agent",
    "description": (
        "Enterprise Loan Origination & Underwriting Multi-Agent System powered by Google ADK. "
        "Provides end-to-end KYC identity verification, financial document spreading, "
        "cross-boundary A2A credit bureau federation, deterministic policy decisioning, "
        "and explainable Credit Assessment Memo (CAM) generation."
    ),
    "version": "1.1.0",
    "protocol": "A2A-1.0",
    "url": f"{settings.los_underwriter_a2a_url}",
    "capabilities": [
        "retail_unsecured_loan_underwriting",
        "sme_working_capital_underwriting",
        "multimodal_document_extraction",
        "deterministic_policy_enforcement",
        "counter_offer_optimization",
        "kfs_generation",
    ],
    "skills": [
        {
            "id": "evaluate_loan_application",
            "name": "Underwrite Loan Application",
            "description": "Executes full multi-agent underwriting pipeline on submitted loan application parameters and documents.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "application_id": {"type": "string"},
                    "applicant": {"type": "object"},
                    "loan_request": {"type": "object"},
                },
                "required": ["applicant", "loan_request"],
            },
        },
        {
            "id": "simulate_counter_offer",
            "name": "Simulate Counter-Offer Parameters",
            "description": "Recalculates FOIR, EMI, and policy rules for revised principal or tenure.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "application_id": {"type": "string"},
                    "proposed_amount": {"type": "number"},
                    "proposed_tenure_months": {"type": "integer"},
                },
                "required": ["application_id", "proposed_amount", "proposed_tenure_months"],
            },
        },
    ],
}


@router.get("/.well-known/agent-card.json")
async def get_los_agent_card():
    """Serves the inbound LOS Underwriter A2A Agent Card."""
    return LOS_UNDERWRITER_AGENT_CARD


@router.post("")
async def handle_los_json_rpc(request: A2aJsonRpcRequest):
    """Handles external JSON-RPC 2.0 requests (e.g.

    from Gemini Enterprise or Branch RM Agents).
    """
    method = request.method
    params = request.params

    if method in ("message/send", "tasks/send", "evaluate_loan_application"):
        return A2aJsonRpcResponse(
            jsonrpc="2.0",
            result={
                "status": "QUEUED_OR_COMPLETED",
                "message": "Loan application received by LOS Underwriter Agent.",
                "los_version": settings.policy_version,
                "agent_card": f"{settings.los_underwriter_a2a_url}/.well-known/agent-card.json",
                "echo_params": params,
            },
            id=request.id,
        )

    return A2aJsonRpcResponse(
        jsonrpc="2.0",
        error={
            "code": -32601,
            "message": f"Method '{method}' not found on LOS Underwriter Agent",
        },
        id=request.id,
    )
