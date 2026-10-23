"""ADK Multi-Agent Orchestrator Service.

Coordinates session lifecycle, document artifacts, ADK Runner pipeline execution,
SSE real-time event broadcasting, and Human-in-the-Loop (HITL) decision gate resumption.
"""

import asyncio
import logging
import uuid
from datetime import UTC, datetime

from app.adk_engine import InMemoryArtifactService, InMemorySessionService, Runner
from app.agent import app as los_app
from app.config import settings
from app.data.personas import ALL_PERSONAS
from app.models.api import (
    CounterOfferSimulationRequest,
    CounterOfferSimulationResponse,
    CreateApplicationRequest,
    DocumentUploadItem,
    UnderwriterDecisionRequest,
)
from app.models.domain import (
    ApplicationStatus,
    AuditLogEntry,
    LoanApplication,
    StoredDocument,
)
from app.services.financial_calculator import (
    compute_foir,
    compute_interest_rate_tier,
    compute_monthly_emi,
    generate_kfs,
)
from app.services.policy_engine import evaluate_credit_policy

logger = logging.getLogger(__name__)


class LosOrchestratorService:
    def __init__(self):
        self.applications: dict[str, LoanApplication] = {}
        self.session_service = InMemorySessionService()
        self.artifact_service = InMemoryArtifactService()
        self.runner = Runner(
            app=los_app,
            session_service=self.session_service,
            artifact_service=self.artifact_service,
        )
        self.event_queues: dict[str, list[asyncio.Queue]] = {}
        self._init_demo_seeds()

    def _init_demo_seeds(self):
        """Pre-seeds the repository with the 3 canonical demo persona applications."""
        for persona_id, preset in ALL_PERSONAS.items():
            app_id = f"LOS-DEMO-{persona_id.upper()[:12]}"
            app_inst = LoanApplication(
                application_id=app_id,
                status=ApplicationStatus.DRAFT,
                applicant=preset.applicant,
                loan_request=preset.loan_request,
                persona_id=persona_id,
            )
            # Attach default documents
            for doc in preset.document_bundle:
                app_inst.documents.append(
                    StoredDocument(
                        doc_id=f"doc-{uuid.uuid4().hex[:8]}",
                        doc_type=doc.doc_type,
                        file_name=doc.file_name,
                        mime_type=doc.mime_type,
                        content_summary=doc.content_summary,
                    )
                )
            self.applications[app_id] = app_inst

    def register_event_listener(self, application_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if application_id not in self.event_queues:
            self.event_queues[application_id] = []
        self.event_queues[application_id].append(queue)
        return queue

    def unregister_event_listener(self, application_id: str, queue: asyncio.Queue) -> None:
        if application_id in self.event_queues:
            self.event_queues[application_id] = [
                q for q in self.event_queues[application_id] if q != queue
            ]

    async def broadcast_event(self, application_id: str, event_type: str, data: dict) -> None:
        payload = {
            "application_id": application_id,
            "event_type": event_type,
            "timestamp": datetime.now(UTC).isoformat(),
            "data": data,
        }
        for q in self.event_queues.get(application_id, []):
            await q.put(payload)

    def create_application(self, req: CreateApplicationRequest) -> LoanApplication:
        app_id = f"LOS-2026-{uuid.uuid4().hex[:6].upper()}"
        app_inst = LoanApplication(
            application_id=app_id,
            status=ApplicationStatus.DRAFT,
            applicant=req.applicant,
            loan_request=req.loan_request,
            persona_id=req.persona_id,
            audit_log=[
                AuditLogEntry(
                    timestamp=datetime.now(UTC),
                    actor="BORROWER_PORTAL",
                    action="APPLICATION_CREATED",
                    previous_status=None,
                    new_status=ApplicationStatus.DRAFT,
                    policy_version=settings.policy_version,
                    details={
                        "amount": req.loan_request.amount,
                        "tenure": req.loan_request.tenure_months,
                    },
                )
            ],
        )

        # If persona_id provided, attach sample documents
        if req.persona_id and req.persona_id in ALL_PERSONAS:
            preset = ALL_PERSONAS[req.persona_id]
            for doc in preset.document_bundle:
                app_inst.documents.append(
                    StoredDocument(
                        doc_id=f"doc-{uuid.uuid4().hex[:8]}",
                        doc_type=doc.doc_type,
                        file_name=doc.file_name,
                        mime_type=doc.mime_type,
                        content_summary=doc.content_summary,
                    )
                )

        self.applications[app_id] = app_inst
        return app_inst

    def attach_documents(
        self, application_id: str, documents: list[DocumentUploadItem]
    ) -> LoanApplication:
        app_inst = self.applications.get(application_id)
        if not app_inst:
            raise ValueError(f"Application {application_id} not found")

        for doc in documents:
            stored = StoredDocument(
                doc_id=f"doc-{uuid.uuid4().hex[:8]}",
                doc_type=doc.doc_type,
                file_name=doc.file_name,
                mime_type=doc.mime_type,
                content_summary=doc.content_summary,
            )
            app_inst.documents.append(stored)
            # Save into ADK artifact service
            self.artifact_service.save_artifact(application_id, doc.doc_type, stored)

        app_inst.status = ApplicationStatus.SUBMITTED
        app_inst.audit_log.append(
            AuditLogEntry(
                timestamp=datetime.now(UTC),
                actor="BORROWER_PORTAL",
                action="DOCUMENTS_UPLOADED",
                previous_status=ApplicationStatus.DRAFT,
                new_status=ApplicationStatus.SUBMITTED,
                policy_version=settings.policy_version,
                details={"doc_count": len(documents)},
            )
        )
        return app_inst

    async def evaluate_application(self, application_id: str) -> LoanApplication:
        app_inst = self.applications.get(application_id)
        if not app_inst:
            raise ValueError(f"Application {application_id} not found")

        app_inst.status = ApplicationStatus.UNDERWRITING
        app_inst.updated_at = datetime.now(UTC)

        await self.broadcast_event(
            application_id,
            "status_changed",
            {
                "status": ApplicationStatus.UNDERWRITING,
                "message": "Initiating ADK Multi-Agent Underwriting Pipeline",
            },
        )

        # Prepare ADK initial state
        initial_state = {
            "application_id": application_id,
            "applicant": app_inst.applicant,
            "loan_request": app_inst.loan_request,
            "persona_id": app_inst.persona_id,
            "status": app_inst.status,
            "audit_log": list(app_inst.audit_log),
            "agent_steps": list(app_inst.agent_steps),
            "a2a_telemetry": list(app_inst.a2a_telemetry),
        }

        async def adk_event_listener(event_type: str, data: dict):
            await self.broadcast_event(application_id, event_type, data)

        # Run ADK Runner
        context = await self.runner.run_async(
            session_id=application_id,
            initial_state=initial_state,
            event_emitter=adk_event_listener,
        )

        # Sync state back to domain object
        st = context.state
        app_inst.status = st.get("status", ApplicationStatus.UNDERWRITING)
        app_inst.document_extraction = st.get("document_extraction")
        app_inst.kyc_result = st.get("kyc_result")
        app_inst.bureau_report = st.get("bureau_report")
        app_inst.underwriting_metrics = st.get("underwriting_metrics")
        app_inst.policy_rules = st.get("policy_rules", [])
        app_inst.counter_offer = st.get("counter_offer")
        app_inst.credit_memo = st.get("credit_memo")
        app_inst.key_fact_statement = st.get("key_fact_statement")
        app_inst.agent_steps = st.get("agent_steps", [])
        app_inst.a2a_telemetry = st.get("a2a_telemetry", [])
        app_inst.audit_log = st.get("audit_log", [])
        app_inst.updated_at = datetime.now(UTC)

        # Audit log for evaluation completion
        app_inst.audit_log.append(
            AuditLogEntry(
                timestamp=datetime.now(UTC),
                actor="ADK_AGENT:los_orchestrator_agent",
                action="UNDERWRITING_EVALUATED",
                previous_status=ApplicationStatus.UNDERWRITING,
                new_status=app_inst.status,
                policy_version=settings.policy_version,
                details={
                    "bureau_score": (
                        app_inst.underwriting_metrics.bureau_score
                        if app_inst.underwriting_metrics
                        else None
                    ),
                    "foir": (
                        app_inst.underwriting_metrics.foir_percentage
                        if app_inst.underwriting_metrics
                        else None
                    ),
                    "outcome": app_inst.status,
                },
            )
        )

        await self.broadcast_event(
            application_id,
            "status_changed",
            {
                "status": app_inst.status,
                "message": f"Pipeline completed with outcome: {app_inst.status}",
            },
        )

        return app_inst

    def simulate_counter_offer(
        self, application_id: str, req: CounterOfferSimulationRequest
    ) -> CounterOfferSimulationResponse:
        app_inst = self.applications.get(application_id)
        if not app_inst or not app_inst.underwriting_metrics:
            raise ValueError(f"Application {application_id} has not been evaluated yet")

        metrics = app_inst.underwriting_metrics
        apr_pct = compute_interest_rate_tier(metrics.bureau_score)
        new_emi = compute_monthly_emi(req.proposed_amount, apr_pct, req.proposed_tenure_months)
        new_foir = compute_foir(
            metrics.existing_emi_outflow, new_emi, metrics.verified_monthly_income
        )

        # Test against policy rules
        test_metrics = metrics.model_copy(
            update={
                "proposed_emi": new_emi,
                "annual_interest_rate_pct": apr_pct,
                "foir_percentage": new_foir,
            }
        )
        status, rules, _ = evaluate_credit_policy(test_metrics, None)

        is_viable = (
            new_foir <= 50.0
            and metrics.bureau_score >= 680
            and metrics.dpd_90_plus_24m == 0
            and metrics.inward_bounces_6m < 2
        )

        summary = (
            f"Revised terms of ₹{req.proposed_amount:,.0f} at {req.proposed_tenure_months} months: "
            f"Proposed EMI ₹{new_emi:,.0f}/mo yields FOIR of {new_foir:.2f}% "
            f"({'Viable - within sustainable debt threshold' if is_viable else 'High Risk - exceeds policy guidelines'})."
        )

        return CounterOfferSimulationResponse(
            proposed_amount=req.proposed_amount,
            proposed_tenure_months=req.proposed_tenure_months,
            interest_rate_pct=apr_pct,
            proposed_emi=new_emi,
            projected_foir=new_foir,
            is_viable=is_viable,
            policy_rules=rules,
            summary=summary,
        )

    def submit_underwriter_decision(
        self, application_id: str, req: UnderwriterDecisionRequest
    ) -> LoanApplication:
        app_inst = self.applications.get(application_id)
        if not app_inst:
            raise ValueError(f"Application {application_id} not found")

        prev_status = app_inst.status

        if req.decision == "APPROVE":
            app_inst.status = ApplicationStatus.APPROVED
            if app_inst.underwriting_metrics:
                app_inst.key_fact_statement = generate_kfs(
                    amount=app_inst.loan_request.amount,
                    tenure_months=app_inst.loan_request.tenure_months,
                    apr_pct=app_inst.underwriting_metrics.annual_interest_rate_pct,
                )
        elif req.decision == "APPROVE_COUNTER":
            app_inst.status = ApplicationStatus.APPROVED
            # Determine sanctioned terms from counter_offer or custom request
            if req.custom_amount and req.custom_tenure:
                sanctioned_amt = req.custom_amount
                sanctioned_tenure = req.custom_tenure
            elif app_inst.counter_offer:
                sanctioned_amt = app_inst.counter_offer.recommended_amount
                sanctioned_tenure = app_inst.counter_offer.recommended_tenure_months
            else:
                sanctioned_amt = app_inst.loan_request.amount
                sanctioned_tenure = app_inst.loan_request.tenure_months

            apr = (
                app_inst.underwriting_metrics.annual_interest_rate_pct
                if app_inst.underwriting_metrics
                else 13.5
            )
            app_inst.key_fact_statement = generate_kfs(
                amount=sanctioned_amt,
                tenure_months=sanctioned_tenure,
                apr_pct=apr,
            )
        elif req.decision == "REJECT":
            app_inst.status = ApplicationStatus.REJECTED

        app_inst.updated_at = datetime.now(UTC)
        app_inst.audit_log.append(
            AuditLogEntry(
                timestamp=datetime.now(UTC),
                actor=req.officer_id,
                action=f"HITL_DECISION:{req.decision}",
                previous_status=prev_status,
                new_status=app_inst.status,
                policy_version=settings.policy_version,
                details={
                    "officer_id": req.officer_id,
                    "notes": req.notes,
                    "custom_amount": req.custom_amount,
                    "custom_tenure": req.custom_tenure,
                },
            )
        )
        return app_inst

    def accept_offer(self, application_id: str, e_signature: str) -> LoanApplication:
        app_inst = self.applications.get(application_id)
        if not app_inst:
            raise ValueError(f"Application {application_id} not found")

        prev_status = app_inst.status
        app_inst.status = ApplicationStatus.DISBURSED
        app_inst.e_signature = e_signature
        app_inst.disbursement_ref = f"DISB-2026-{uuid.uuid4().hex[:8].upper()}"
        app_inst.updated_at = datetime.now(UTC)

        app_inst.audit_log.append(
            AuditLogEntry(
                timestamp=datetime.now(UTC),
                actor="BORROWER_PORTAL",
                action="OFFER_ACCEPTED_ESIGNED",
                previous_status=prev_status,
                new_status=ApplicationStatus.DISBURSED,
                policy_version=settings.policy_version,
                details={
                    "e_signature": e_signature,
                    "disbursement_ref": app_inst.disbursement_ref,
                },
            )
        )
        return app_inst


orchestrator_service = LosOrchestratorService()
