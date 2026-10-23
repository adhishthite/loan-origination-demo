"""FastAPI Application entrypoint for the Loan Origination System (LOS).

Exposes REST APIs, real-time SSE telemetry, and federated A2A Agent Cards
for Google ADK and Agent-to-Agent protocol integration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.a2a.bureau_server import router as bureau_a2a_router
from app.a2a.los_agent_card import router as los_a2a_router
from app.api.routes import router as core_api_router
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("los-backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================")
    logger.info("Retail & SME Loan Origination System (LOS) Backend")
    logger.info(f"Version: {settings.app_version} | Policy Version: {settings.policy_version}")
    logger.info(f"Gemini Model: {settings.model_name}")
    logger.info(f"Active GCP Project: {settings.gcp_project}")
    logger.info(
        f"Inbound LOS A2A Card: {settings.los_underwriter_a2a_url}/.well-known/agent-card.json"
    )
    logger.info(f"Outbound Bureau A2A Card: {settings.bureau_a2a_url}/.well-known/agent-card.json")
    logger.info("==================================================")
    yield
    logger.info("LOS Backend shutting down...")


app = FastAPI(
    title="Retail & SME Loan Origination System (LOS)",
    description=(
        "Autonomous, AI-Augmented Underwriting Pipeline powered by Google ADK (Agent Development Kit), "
        "Agent-to-Agent (A2A) protocol federation, and Google Gemini."
    ),
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(core_api_router)
app.include_router(bureau_a2a_router)
app.include_router(los_a2a_router)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")
