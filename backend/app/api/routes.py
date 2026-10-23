"""REST and SSE API Routes for the Loan Origination System."""

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.data.personas import ALL_PERSONAS
from app.models.api import (
    AcceptOfferRequest,
    ApplicationSummary,
    CounterOfferSimulationRequest,
    CounterOfferSimulationResponse,
    CreateApplicationRequest,
    DemoPersonaPreset,
    DocumentBundleRequest,
    HealthResponse,
    UnderwriterDecisionRequest,
)
from app.models.domain import LoanApplication
from app.services.orchestrator import orchestrator_service

router = APIRouter(prefix="/api/v1", tags=["LOS Core API"])


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Health check endpoint exposing system, ADK and A2A status."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        policy_version=settings.policy_version,
        model_name=settings.model_name,
        active_gcp_project=settings.gcp_project,
        adk_status="ACTIVE",
        a2a_bureau_server="RUNNING",
    )


@router.get("/personas", response_model=list[DemoPersonaPreset])
async def list_personas():
    """Returns the 3 pre-baked demo personas (Clean STP, Grey-Zone Counter, Knockout Reject)."""
    return list(ALL_PERSONAS.values())


@router.get("/applications", response_model=list[ApplicationSummary])
async def list_applications():
    """Lists all applications with masked PII (XXXXX1234F)."""
    apps = list(orchestrator_service.applications.values())
    # Sort by created_at desc
    apps.sort(key=lambda a: a.created_at, reverse=True)
    return [ApplicationSummary.from_application(a) for a in apps]


@router.post("/applications", response_model=LoanApplication)
async def create_application(req: CreateApplicationRequest):
    """Creates a new loan application in DRAFT state (or initializes from persona)."""
    return orchestrator_service.create_application(req)


@router.get("/applications/{application_id}", response_model=LoanApplication)
async def get_application(application_id: str):
    """Fetches the full loan application state including metrics, rules, CAM, KFS, and audit trail."""
    app_inst = orchestrator_service.applications.get(application_id)
    if not app_inst:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    return app_inst


@router.post("/applications/{application_id}/documents", response_model=LoanApplication)
async def upload_documents(application_id: str, bundle: DocumentBundleRequest):
    """Uploads borrower documents into the ADK Artifact Service and transitions to SUBMITTED."""
    try:
        return orchestrator_service.attach_documents(application_id, bundle.documents)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/applications/{application_id}/evaluate", response_model=LoanApplication)
async def evaluate_application(application_id: str):
    """Triggers the ADK Multi-Agent Underwriting Pipeline (Parallel KYC/Spreading/A2A Bureau -> Policy -> CAM)."""
    try:
        return await orchestrator_service.evaluate_application(application_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline evaluation error: {str(e)}") from e


@router.post(
    "/applications/{application_id}/simulate-counter",
    response_model=CounterOfferSimulationResponse,
)
async def simulate_counter_offer(application_id: str, req: CounterOfferSimulationRequest):
    """Interactive underwriter slider: recalculates FOIR, EMI, and policy rules for custom loan parameters."""
    try:
        return orchestrator_service.simulate_counter_offer(application_id, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/applications/{application_id}/decision", response_model=LoanApplication)
async def submit_decision(application_id: str, req: UnderwriterDecisionRequest):
    """Resumes the ADK HITL Gate: Credit Officer submits APPROVE, APPROVE_COUNTER, or REJECT."""
    try:
        return orchestrator_service.submit_underwriter_decision(application_id, req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/applications/{application_id}/accept-offer", response_model=LoanApplication)
async def accept_offer(application_id: str, req: AcceptOfferRequest):
    """Borrower e-signs the Key Fact Statement (KFS) and triggers instant DISBURSED state."""
    try:
        return orchestrator_service.accept_offer(application_id, req.e_signature)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/applications/{application_id}/events")
async def stream_application_events(application_id: str, request: Request):
    """Server-Sent Events (SSE) endpoint streaming real-time ADK agent handoffs and A2A wire messages."""
    queue = orchestrator_service.register_event_listener(application_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Yield initial connection heartbeat
            initial_event = {
                "application_id": application_id,
                "event_type": "connected",
                "timestamp": datetime.now(UTC).isoformat(),
                "data": {"message": "Connected to ADK live event telemetry stream"},
            }
            yield json.dumps(initial_event)

            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield json.dumps(event)
                except TimeoutError:
                    # Keepalive ping
                    ping = {
                        "application_id": application_id,
                        "event_type": "ping",
                        "timestamp": datetime.now(UTC).isoformat(),
                        "data": {},
                    }
                    yield json.dumps(ping)
        finally:
            orchestrator_service.unregister_event_listener(application_id, queue)

    return EventSourceResponse(event_generator())
