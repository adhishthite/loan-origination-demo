"""Integration tests for FastAPI REST, SSE, and A2A Endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["adk_status"] == "ACTIVE"
        assert data["a2a_bureau_server"] == "RUNNING"


@pytest.mark.asyncio
async def test_a2a_agent_cards_and_rpc():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Outbound Credit Bureau Agent Card
        resp_bureau_card = await client.get("/a2a/credit_bureau/.well-known/agent-card.json")
        assert resp_bureau_card.status_code == 200
        card_data = resp_bureau_card.json()
        assert card_data["name"] == "credit_bureau_fraud_consortium_agent"
        assert "credit_bureau_tradeline_pull" in card_data["capabilities"]

        # Bureau JSON-RPC endpoint
        resp_rpc = await client.post(
            "/a2a/credit_bureau",
            json={
                "jsonrpc": "2.0",
                "method": "tasks/send",
                "params": {"tax_id": "ABCDE1234F", "applicant_name": "Priya Raghavan"},
                "id": "test-1",
            },
        )
        assert resp_rpc.status_code == 200
        rpc_data = resp_rpc.json()
        assert rpc_data["result"]["bureau_report"]["bureau_score"] == 792

        # Inbound LOS Underwriter Agent Card
        resp_los_card = await client.get("/a2a/los_underwriter/.well-known/agent-card.json")
        assert resp_los_card.status_code == 200
        los_card = resp_los_card.json()
        assert los_card["name"] == "los_underwriter_agent"


@pytest.mark.asyncio
async def test_persona_and_application_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch Personas
        resp_personas = await client.get("/api/v1/personas")
        assert resp_personas.status_code == 200
        personas = resp_personas.json()
        assert len(personas) == 3

        # 2. List Applications (PII Masked)
        resp_apps = await client.get("/api/v1/applications")
        assert resp_apps.status_code == 200
        app_list = resp_apps.json()
        assert len(app_list) >= 3
        for item in app_list:
            assert item["masked_tax_id"].startswith("XXXXX")

        # 3. Create Custom Application
        new_app_payload = {
            "applicant": {
                "full_name": "Pooja Sharma",
                "dob": "1995-08-20",
                "tax_id": "PQRST4321A",
                "employment_type": "SALARIED",
                "declared_monthly_income": 130000.0,
            },
            "loan_request": {
                "amount": 900000.0,
                "tenure_months": 36,
                "purpose": "HOME_RENOVATION",
            },
        }
        resp_create = await client.post("/api/v1/applications", json=new_app_payload)
        assert resp_create.status_code == 200
        app_data = resp_create.json()
        app_id = app_data["application_id"]
        assert app_data["status"] == "DRAFT"

        # 4. Upload Documents
        docs_payload = {
            "documents": [
                {
                    "doc_type": "ID_PROOF",
                    "file_name": "Pooja_PAN.pdf",
                    "mime_type": "application/pdf",
                    "content_summary": "PAN: PQRST4321A",
                },
                {
                    "doc_type": "BANK_STATEMENT",
                    "file_name": "Pooja_HDFC.pdf",
                    "mime_type": "application/pdf",
                    "content_summary": "Clean statement, AMB ₹60,000",
                },
            ]
        }
        resp_upload = await client.post(
            f"/api/v1/applications/{app_id}/documents", json=docs_payload
        )
        assert resp_upload.status_code == 200
        assert resp_upload.json()["status"] == "SUBMITTED"

        # 5. Evaluate Underwriting Pipeline
        resp_eval = await client.post(f"/api/v1/applications/{app_id}/evaluate")
        assert resp_eval.status_code == 200
        evaluated = resp_eval.json()
        assert evaluated["status"] in ("AUTO_APPROVED", "MANUAL_REVIEW")
        assert evaluated["underwriting_metrics"] is not None

        # 6. Simulate Counter Offer
        sim_payload = {"proposed_amount": 750000.0, "proposed_tenure_months": 48}
        resp_sim = await client.post(
            f"/api/v1/applications/{app_id}/simulate-counter", json=sim_payload
        )
        assert resp_sim.status_code == 200
        sim_result = resp_sim.json()
        assert sim_result["proposed_amount"] == 750000.0
        assert sim_result["projected_foir"] > 0

        # 7. Credit Officer Decision (Approve)
        decision_payload = {
            "decision": "APPROVE",
            "officer_id": "CREDIT_OFFICER_01",
            "notes": "Strong income profile and low debt obligations.",
        }
        resp_dec = await client.post(
            f"/api/v1/applications/{app_id}/decision", json=decision_payload
        )
        assert resp_dec.status_code == 200
        assert resp_dec.json()["status"] == "APPROVED"
        assert resp_dec.json()["key_fact_statement"] is not None

        # 8. Accept Offer / e-Sign
        accept_payload = {"e_signature": "Pooja Sharma"}
        resp_accept = await client.post(
            f"/api/v1/applications/{app_id}/accept-offer", json=accept_payload
        )
        assert resp_accept.status_code == 200
        disbursed = resp_accept.json()
        assert disbursed["status"] == "DISBURSED"
        assert disbursed["disbursement_ref"] is not None
        assert disbursed["e_signature"] == "Pooja Sharma"
