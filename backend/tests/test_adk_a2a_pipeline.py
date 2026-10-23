"""Tests for Google ADK Multi-Agent Pipeline and A2A Protocol Federation."""

import pytest

from app.a2a.bureau_server import execute_bureau_a2a_call, query_bureau_database
from app.callbacks import mask_pii_dict, mask_pii_string
from app.models.domain import ApplicationStatus
from app.services.orchestrator import orchestrator_service


class TestA2aProtocol:
    @pytest.mark.asyncio
    async def test_bureau_a2a_execution_and_telemetry(self):
        bureau_report, watchlist_hit, exchange = await execute_bureau_a2a_call(
            tax_id="ABCDE1234F",
            applicant_name="Priya Raghavan",
        )
        assert bureau_report.bureau_score == 792
        assert bureau_report.dpd_90_plus_24m == 0
        assert watchlist_hit is False
        assert exchange.protocol == "A2A-JSON-RPC-2.0"
        assert exchange.target_agent == "credit_bureau_fraud_consortium_agent"
        assert exchange.latency_ms >= 0

    def test_bureau_query_personas(self):
        stp_data = query_bureau_database("ABCDE1234F")
        assert stp_data["bureau_score"] == 792

        grey_data = query_bureau_database("ABCDE5678G")
        assert grey_data["bureau_score"] == 732

        reject_data = query_bureau_database("ABCDE9012H")
        assert reject_data["bureau_score"] == 615
        assert reject_data["dpd_90_plus_24m"] == 2


class TestPiiMaskingAndCallbacks:
    def test_pii_masking(self):
        raw = "Applicant PAN is ABCDE1234F and account is 1234567890."
        masked = mask_pii_string(raw)
        assert "ABCDE1234F" not in masked
        assert "XXXXX1234F" in masked

    def test_dict_pii_masking(self):
        data = {
            "pan": "ABCDE5678G",
            "nested": {"details": "PAN: ABCDE9012H"},
        }
        res = mask_pii_dict(data)
        assert res["pan"] == "XXXXX5678G"
        assert "XXXXX9012H" in res["nested"]["details"]


class TestAdkPipelineExecution:
    @pytest.mark.asyncio
    async def test_stp_clean_pipeline(self):
        # Seeded application for persona_stp_clean
        app_id = "LOS-DEMO-PERSONA_STP_"
        assert app_id in orchestrator_service.applications

        evaluated = await orchestrator_service.evaluate_application(app_id)
        assert evaluated.status == ApplicationStatus.AUTO_APPROVED
        assert evaluated.underwriting_metrics is not None
        assert evaluated.underwriting_metrics.bureau_score == 792
        assert evaluated.key_fact_statement is not None
        assert evaluated.credit_memo is not None
        assert len(evaluated.a2a_telemetry) > 0
        assert len(evaluated.agent_steps) > 0

    @pytest.mark.asyncio
    async def test_grey_zone_counter_offer_pipeline(self):
        app_id = "LOS-DEMO-PERSONA_GREY"
        assert app_id in orchestrator_service.applications

        evaluated = await orchestrator_service.evaluate_application(app_id)
        assert evaluated.status == ApplicationStatus.MANUAL_REVIEW
        assert evaluated.counter_offer is not None
        assert evaluated.counter_offer.projected_foir <= 48.0
        assert evaluated.credit_memo is not None
        assert len(evaluated.agent_steps) > 0

    @pytest.mark.asyncio
    async def test_reject_knockout_pipeline(self):
        app_id = "LOS-DEMO-PERSONA_REJE"
        assert app_id in orchestrator_service.applications

        evaluated = await orchestrator_service.evaluate_application(app_id)
        assert evaluated.status == ApplicationStatus.REJECTED
        assert evaluated.underwriting_metrics.bureau_score == 615
        assert evaluated.underwriting_metrics.inward_bounces_6m == 3
        # Confirm audit log records rejection
        assert any("UNDERWRITING_EVALUATED" in a.action for a in evaluated.audit_log)
