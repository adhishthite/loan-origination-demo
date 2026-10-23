"""Federated Credit Bureau & Fraud Consortium A2A Server.

Exposes the A2A Agent Card at:
    GET /a2a/credit_bureau/.well-known/agent-card.json
And the JSON-RPC 2.0 endpoint at:
    POST /a2a/credit_bureau
"""

import time
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter

from app.config import settings
from app.models.api import A2aJsonRpcRequest, A2aJsonRpcResponse
from app.models.domain import A2aExchangeRecord, BureauReport

router = APIRouter(prefix="/a2a/credit_bureau", tags=["A2A Credit Bureau"])

BUREAU_AGENT_CARD = {
    "name": "credit_bureau_fraud_consortium_agent",
    "description": (
        "Federated partner agent serving authenticated credit bureau tradelines, "
        "DPD delinquency history, and fraud watchlist screening over the A2A protocol."
    ),
    "version": "2.4.0",
    "protocol": "A2A-1.0",
    "url": f"{settings.bureau_a2a_url}",
    "capabilities": [
        "credit_bureau_tradeline_pull",
        "delinquency_history_24m",
        "sanctions_watchlist_check",
        "cibil_crif_experian_aggregator",
    ],
    "skills": [
        {
            "id": "get_credit_tradelines",
            "name": "Retrieve Comprehensive Credit Tradelines",
            "description": "Returns credit bureau score (300-900), active tradelines, 30-60 DPD and 90+ DPD counts.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tax_id": {"type": "string", "description": "PAN or National Tax Identifier"},
                    "applicant_name": {"type": "string"},
                    "dob": {"type": "string", "format": "date"},
                },
                "required": ["tax_id"],
            },
        },
        {
            "id": "screen_watchlist",
            "name": "Global Sanctions & Defaulter Screening",
            "description": "Screens applicant against OFAC, RBI Wilful Defaulter list, and fraud consortium.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tax_id": {"type": "string"},
                },
                "required": ["tax_id"],
            },
        },
    ],
}


def query_bureau_database(tax_id: str) -> dict:
    """Simulated credit bureau repository returning data keyed by tax_id."""
    # Priya Raghavan (Clean STP)
    if "1234F" in tax_id:
        return {
            "bureau_score": 792,
            "active_tradelines": 4,
            "dpd_30_60_24m": 0,
            "dpd_90_plus_24m": 0,
            "recent_inquiries_6m": 1,
            "watchlist_hit": False,
            "delinquent_accounts": [],
        }
    # Arjun Malhotra (Grey-Zone)
    elif "5678G" in tax_id:
        return {
            "bureau_score": 732,
            "active_tradelines": 3,
            "dpd_30_60_24m": 0,
            "dpd_90_plus_24m": 0,
            "recent_inquiries_6m": 2,
            "watchlist_hit": False,
            "delinquent_accounts": [],
        }
    # Sourav Banerjee (Knockout Reject)
    elif "9012H" in tax_id:
        return {
            "bureau_score": 615,
            "active_tradelines": 6,
            "dpd_30_60_24m": 2,
            "dpd_90_plus_24m": 2,
            "recent_inquiries_6m": 7,
            "watchlist_hit": False,
            "delinquent_accounts": ["SME Equipment Loan (Overdue 120 DPD)"],
        }
    # Default fallback for custom applications
    else:
        return {
            "bureau_score": 755,
            "active_tradelines": 2,
            "dpd_30_60_24m": 0,
            "dpd_90_plus_24m": 0,
            "recent_inquiries_6m": 1,
            "watchlist_hit": False,
            "delinquent_accounts": [],
        }


@router.get("/.well-known/agent-card.json")
async def get_bureau_agent_card():
    """Serves the Federated Credit Bureau A2A Agent Card discovery manifest."""
    return BUREAU_AGENT_CARD


@router.post("")
async def handle_bureau_json_rpc(request: A2aJsonRpcRequest):
    """Handles JSON-RPC 2.0 tasks/queries from external agents or LOS orchestrator."""
    method = request.method
    params = request.params

    if method in ("message/send", "tasks/send", "get_credit_tradelines"):
        tax_id = params.get("tax_id", "")
        data = query_bureau_database(tax_id)
        return A2aJsonRpcResponse(
            jsonrpc="2.0",
            result={
                "bureau_report": {
                    "bureau_score": data["bureau_score"],
                    "active_tradelines": data["active_tradelines"],
                    "dpd_30_60_24m": data["dpd_30_60_24m"],
                    "dpd_90_plus_24m": data["dpd_90_plus_24m"],
                    "recent_inquiries_6m": data["recent_inquiries_6m"],
                },
                "watchlist_screening": {
                    "watchlist_hit": data["watchlist_hit"],
                    "delinquent_accounts": data["delinquent_accounts"],
                },
                "status": "SUCCESS",
                "issued_by": "CreditBureauA2A::ConsortiumGateway-India",
            },
            id=request.id,
        )

    return A2aJsonRpcResponse(
        jsonrpc="2.0",
        error={
            "code": -32601,
            "message": f"Method '{method}' not found on Credit Bureau A2A Agent",
        },
        id=request.id,
    )


async def execute_bureau_a2a_call(
    tax_id: str,
    applicant_name: str,
    caller_agent_name: str = "los_orchestrator_agent::credit_bureau_a2a_bridge",
) -> tuple[BureauReport, bool, A2aExchangeRecord]:
    """In-process or network client that calls the Credit Bureau A2A endpoint

    and generates an immutable A2aExchangeRecord for observability.
    """
    start_time = time.perf_counter()
    req_id = f"rpc-{uuid.uuid4().hex[:8]}"

    request_payload = {
        "jsonrpc": "2.0",
        "method": "tasks/send",
        "params": {
            "skill": "get_credit_tradelines",
            "tax_id": tax_id,
            "applicant_name": applicant_name,
        },
        "id": req_id,
    }

    # Query the bureau logic directly
    data = query_bureau_database(tax_id)

    response_payload = {
        "jsonrpc": "2.0",
        "result": {
            "bureau_report": {
                "bureau_score": data["bureau_score"],
                "active_tradelines": data["active_tradelines"],
                "dpd_30_60_24m": data["dpd_30_60_24m"],
                "dpd_90_plus_24m": data["dpd_90_plus_24m"],
                "recent_inquiries_6m": data["recent_inquiries_6m"],
            },
            "watchlist_screening": {
                "watchlist_hit": data["watchlist_hit"],
                "delinquent_accounts": data["delinquent_accounts"],
            },
            "status": "SUCCESS",
            "issued_by": "CreditBureauA2A::ConsortiumGateway-India",
        },
        "id": req_id,
    }

    latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    exchange_record = A2aExchangeRecord(
        exchange_id=req_id,
        timestamp=datetime.now(UTC),
        caller_agent=caller_agent_name,
        target_agent="credit_bureau_fraud_consortium_agent",
        agent_card_url=f"{settings.bureau_a2a_url}/.well-known/agent-card.json",
        protocol="A2A-JSON-RPC-2.0",
        request_payload=request_payload,
        response_payload=response_payload,
        latency_ms=latency_ms,
    )

    bureau_report = BureauReport(
        bureau_score=data["bureau_score"],
        active_tradelines=data["active_tradelines"],
        dpd_30_60_24m=data["dpd_30_60_24m"],
        dpd_90_plus_24m=data["dpd_90_plus_24m"],
        recent_inquiries_6m=data["recent_inquiries_6m"],
    )

    return bureau_report, data["watchlist_hit"], exchange_record
