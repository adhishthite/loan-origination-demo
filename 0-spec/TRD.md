# Technical Requirements Document (TRD): Retail & SME Loan Origination System (LOS)

| Document ID | Version | Status | Parent Spec | Target Stack |
| :--- | :--- | :--- | :--- | :--- |
| `TRD-LOS-2026-001` | 1.1 | Approved for Build (ADK + A2A) | [`BRD-LOS-2026-001`](./BRD.md) | React 19 + TypeScript (`bun`, `biome`, ShadCN, OKLCH) / Python 3.12+ (`FastAPI`, `google-adk[a2a]`, `google-genai`, `uv`, `ruff`) |

---

## 1. Architectural Principles & Non-Functional Guardrails

1. **Google ADK Multi-Agent & A2A First Architecture (`TRD-ADK-01`):**
   - The backend underwriting pipeline is built natively on **Google Agent Development Kit (`google-adk[a2a]`)** using `SequentialAgent`, `ParallelAgent`, `Agent` (`LlmAgent`), `RemoteA2aAgent`, `FunctionTool`, `InMemorySessionService`, `InMemoryArtifactService`, and `Runner`.
   - **Cross-Boundary Agent-to-Agent (`A2A`) Federation (`TRD-A2A-01`):**
     - **Outbound A2A Consumer (`RemoteA2aAgent`):** Credit Bureau & Sanctions Watchlist verification is delegated over the **A2A Protocol** to a dedicated **Credit Bureau & Fraud Consortium A2A Server** (`credit_bureau_a2a_agent`) exposing `/.well-known/agent-card.json`.
     - **Inbound A2A Provider (`to_a2a` / `AgentCard`):** The root `los_orchestrator_agent` is exposed as an A2A-compliant service (`/a2a/los_underwriter/.well-known/agent-card.json`) so external Branch RM agents, partner portals, or **Gemini Enterprise** (`agents-cli publish gemini`) can invoke loan underwriting via standard A2A task requests.
2. **Strict Separation of AI vs. Deterministic Logic (`TRD-NFR-01`):**
   - **LLM Agent Boundary:** ADK `Agent`s (`gemini-2.5-flash`) are used **strictly** for (a) multimodal KYC & bank statement extraction (`kyc_fraud_agent`, `financial_spreading_agent`) and (b) structured synthesis of the Credit Assessment Memo (`cam_synthesizer_agent`) after deterministic metrics and rule outcomes have already been computed in `session.state`.
   - **Deterministic Tool Boundary:** All financial arithmetic (`EMI`, `FOIR`, income variance, APR tier pricing, KFS schedule, and counter-offer optimization) and credit policy rules (`POL-01` through `POL-06`) execute in pure, unit-tested Python `FunctionTool`s reading and mutating `tool_context.state`.
3. **Explainability, Callbacks & Immutable Audit Trail (`TRD-NFR-02`):**
   - ADK `before_agent_callback`, `before_model_callback`, and `after_tool_callback` hooks automatically record every agent transition, A2A remote invocation, tool execution, and human override into `session.state["audit_log"]` with UTC ISO-8601 timestamps, actor (`ADK_AGENT:<name>`, `A2A_REMOTE:credit_bureau_a2a_agent`, or `CREDIT_OFFICER_ID`), and policy version (`v2026.10.1`).
4. **PII Masking & Enterprise Governance (`TRD-NFR-03`):**
   - Tax IDs (PAN) and Bank Account Numbers are masked (`XXXXX1234F`) in list responses, SSE telemetry, and ADK `before_model_callback` / `BigQueryAgentAnalyticsPlugin` traces.
5. **Latency SLAs (`TRD-NFR-04`):**
   - A2A Bureau call + Deterministic Financial & Rule Engine execution: `< 500ms` (target `< 2s`).
   - End-to-end ADK `ParallelAgent` multimodal extraction + CAM synthesis: `< 15s` with live ADK `Event` streaming over Server-Sent Events (SSE).

---

## 2. System & Multi-Agent A2A Architecture

```mermaid
flowchart TB
    subgraph ExternalConsumers["External A2A Consumers (Gemini Enterprise / Branch RM Agent)"]
        GemEnt["Gemini App / Agent Registry<br/>(agents-cli publish gemini)"]
    end

    subgraph Frontend["Frontend (Vite + React 19 + TypeScript + ShadCN + OKLCH)"]
        BP["View 1: Borrower Portal<br/>(Persona Presets, Form, Doc Upload, KFS e-Sign)"]
        UW["View 2: Underwriter Workbench<br/>(ADK Agent/A2A Live Graph, Rule Scorecard, Counter-Offer Sim, HITL Gate)"]
        SSEClient["Real-Time ADK Event Stream Consumer (SSE)"]
    end

    subgraph Backend["Backend (FastAPI + Google ADK `google-adk[a2a]` + `uv`)"]
        API["FastAPI REST + SSE + A2A Router<br/>(/api/v1/* & /a2a/los_underwriter/.well-known/agent-card.json)"]
        Runner["ADK Runner + InMemorySessionService + InMemoryArtifactService"]
        Callbacks["ADK Guardrail & Audit Callbacks<br/>(before_model_callback, after_tool_callback)"]

        subgraph RootAgent["Root Orchestrator: `los_orchestrator_agent` (ADK SequentialAgent)"]
            subgraph ParallelStage["Stage 1: `parallel_verification_stage` (ADK ParallelAgent)"]
                KYCAgent["`kyc_fraud_agent` (LlmAgent)<br/>Multimodal ID Extract + Fuzzy Match"]
                SpreadAgent["`financial_spreading_agent` (LlmAgent)<br/>Bank Statement Spread + Variance"]
                BureauClient["`bureau_a2a_client` (RemoteA2aAgent)<br/>A2A Protocol Client"]
            end

            subgraph PolicyStage["Stage 2: `deterministic_policy_agent` (LlmAgent + Deterministic FunctionTools)"]
                FinTool["`compute_financial_ratios_tool`<br/>(EMI, FOIR, APR, Counter-Offer)"]
                PolTool["`evaluate_credit_policy_tool`<br/>(POL-01..POL-06 + Adverse Codes)"]
            end

            subgraph CAMStage["Stage 3: `cam_synthesizer_agent` (LlmAgent + HITL Gate)"]
                CAMOut["Structured Credit Assessment Memo (CAM)<br/>+ KFS / HITL Pause (`MANUAL_REVIEW`)"]
            end
        end
    end

    subgraph A2AFederation["Federated Partner A2A Server (Mounted / Remote A2A Service)"]
        BureauA2A["`credit_bureau_a2a_server` (ADK to_a2a)<br/>GET /a2a/credit_bureau/.well-known/agent-card.json<br/>POST /a2a/credit_bureau (JSON-RPC A2A Task)"]
    end

    GemEnt <-->|A2A Protocol / :streamQuery| API
    BP -->|POST /applications & /documents| API
    UW -->|POST /evaluate & /decision| API
    SSEClient <-->|GET /applications/:id/events| API
    API --> Runner
    Runner --> Callbacks
    Runner --> RootAgent
    ParallelStage --> PolicyStage --> CAMStage
    BureauClient <-->|A2A JSON-RPC + AgentCard| BureauA2A
```

---

## 3. Repository & Directory Layout (`standalone-stack` + ADK Standard Layout)

```text
loan-origination-demo/
├── 0-spec/
│   ├── BRD.md                          # Business Requirements Document (v1.1 ADK + A2A)
│   └── TRD.md                          # Technical Requirements Document (this file)
├── Makefile                            # Root orchestration (start, dev, test, format, lint, clean, check)
├── README.md                           # Quickstart, ADK & A2A architecture overview, agents-cli commands
├── backend/
│   ├── Makefile                        # Backend targets using `uv run` and `ruff`
│   ├── pyproject.toml                  # Python 3.12+, fastapi, uvicorn, google-adk, a2a-sdk, google-genai, pydantic, pytest, ruff
│   ├── uv.lock
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI app, CORS, REST routes + mounted A2A Agent Card & JSON-RPC routes
│   │   ├── config.py                   # Env settings (GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, POLICY_VERSION)
│   │   ├── agent.py                    # Standard ADK entrypoint: defines `root_agent` (`los_orchestrator_agent`) and `app` (`App`)
│   │   ├── callbacks.py                # ADK `before_agent_callback`, `before_model_callback` (PII mask), `after_tool_callback` (Audit)
│   │   ├── a2a_bureau_server.py        # Federated Credit Bureau & Watchlist Agent exposed via A2A (`AgentCard` + task handler)
│   │   ├── models/
│   │   │   ├── domain.py               # Core Pydantic v2 schemas (Application, Metrics, Rules, CAM, KFS, A2A Telemetry, Audit)
│   │   │   └── api.py                  # Request/Response DTOs
│   │   ├── services/
│   │   │   ├── kyc_service.py          # TRD-03, TRD-04: Fuzzy name/DOB/ID match + Watchlist/Dedupe
│   │   │   ├── document_parser.py      # TRD-05, TRD-06: Gemini multimodal extraction + fallback fixture parser
│   │   │   ├── bureau_service.py       # TRD-07: Credit Bureau pull backing the A2A Credit Bureau Agent
│   │   │   ├── financial_calculator.py # TRD-08, TRD-11: Deterministic EMI, FOIR, Counter-Offer & KFS generator
│   │   │   ├── policy_engine.py        # TRD-09, TRD-12: Deterministic POL-01..POL-06 evaluator & adverse codes
│   │   │   ├── cam_generator.py        # TRD-10: Gemini structured CAM generator with deterministic fallback
│   │   │   └── orchestrator.py         # ADK Runner wrapper, Session/Artifact management, A2A invocation & SSE emitter
│   │   ├── data/
│   │   │   └── personas.py             # Pre-baked demo personas (STP, Grey-Zone, Reject) + sample doc fixtures
│   │   └── api/
│   │       └── routes.py               # REST, SSE & A2A discovery endpoints (`/a2a/*/agent-card.json`)
│   └── tests/
│       ├── eval/
│       │   ├── eval_config.yaml        # ADK Evaluation config (`tool_trajectory_avg_score`, `response_match_score`)
│       │   └── los_eval_dataset.json   # ADK evaluation dataset for `agents-cli eval`
│       ├── test_financial_calculator.py
│       ├── test_policy_engine.py
│       ├── test_adk_a2a_pipeline.py    # Tests ADK agents, A2A Agent Cards, A2A JSON-RPC task execution
│       └── test_api_flow.py
└── frontend/
    ├── Makefile                        # Frontend targets using `bun` and `biome`
    ├── package.json                    # Vite, React 19, TypeScript, Tailwind/OKLCH, ShadCN primitives, Lucide
    ├── biome.json                      # Biome linter & formatter configuration
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                     # Top-level layout: Theme toggle, Mode switcher (Borrower vs. Underwriter), A2A Card Modal
        ├── styles/
        │   └── globals.css             # OKLCH color tokens (light/dark low-glare surfaces, semantic badges)
        ├── types/
        │   └── los.ts                  # 1:1 TypeScript mirror of backend Pydantic schemas + ADK/A2A telemetry types
        ├── api/
        │   └── client.ts               # Typed REST client + SSE hook + A2A Agent Card inspector
        └── components/
            ├── borrower/
            │   ├── PersonaSelector.tsx # 1-click pre-baked demo persona loader
            │   ├── ApplicationForm.tsx # Loan & applicant intake form (FR-01, FR-02)
            │   └── SanctionKfsCard.tsx # Key Fact Statement, amortization preview & e-Sign (FR-11)
            ├── underwriter/
            │   ├── AdkPipelineGraph.tsx# Live ADK Sequential/Parallel Agent + A2A Bureau telemetry visualizer
            │   ├── RuleScorecard.tsx   # POL-01..POL-06 Green/Amber/Red badge matrix
            │   ├── DocSpreadViewer.tsx # Extracted KYC & bank statement spread + variance alert
            │   ├── CreditMemoPanel.tsx # Structured AI Credit Assessment Memo (CAM)
            │   ├── CounterOfferSim.tsx # Interactive tenure/amount slider recalculating FOIR live
            │   └── DecisionBar.tsx     # 1-click Approve / Counter-Offer / Reject with audit reason
            └── shared/
                ├── A2aInspectorModal.tsx # Interactive viewer for live `/.well-known/agent-card.json` & A2A JSON-RPC payloads
                └── AuditTimeline.tsx   # Immutable ADK callback & HITL event log drawer
```

---

## 4. Google ADK & A2A Technical Implementation (`backend/app/agent.py`)

### 4.1 ADK Agent Hierarchy & Factory Pattern (`TRD-ADK-01`)

Following Google ADK best practices (`google-agents-cli-adk-code`), sub-agents are instantiated via factory functions so each composite workflow owns a fresh agent tree:

```python
from google.adk.agents import Agent, ParallelAgent, SequentialAgent
from google.adk.apps import App, ResumabilityConfig
from google.adk.tools import FunctionTool, ToolContext

def create_kyc_fraud_agent() -> Agent:
    return Agent(
        name="kyc_fraud_agent",
        model="gemini-2.5-flash",
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
        model="gemini-2.5-flash",
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
    """Invokes the federated Credit Bureau & Fraud Consortium Agent via the A2A Protocol."""
    return Agent(
        name="credit_bureau_a2a_bridge",
        model="gemini-2.5-flash",
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
        model="gemini-2.5-flash",
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
        model="gemini-2.5-flash",
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
```

---

### 4.2 Agent-to-Agent (`A2A`) Protocol Specification (`TRD-A2A-01`, `TRD-A2A-02`)

The backend exposes **two live A2A-compliant Agent Cards and JSON-RPC task endpoints** so users and judges can inspect and invoke A2A both internally (LOS -> Credit Bureau) and externally (Gemini Enterprise / Branch RM -> LOS):

1. **Federated Credit Bureau & Watchlist A2A Service (`/a2a/credit_bureau`):**
   - **Discovery Endpoint:** `GET /a2a/credit_bureau/.well-known/agent-card.json`
   - **Task Endpoint:** `POST /a2a/credit_bureau` (JSON-RPC 2.0 `message/send` / `tasks/send`)
   - **Capabilities & Skills:** `credit_bureau_tradeline_pull`, `sanctions_watchlist_check`.
   - **Telemetry Capture:** Every A2A handshake records the full `A2aExchangeRecord` (request ID, source agent, target agent card URL, JSON-RPC request/response payload, and latency in ms) into `application.a2a_telemetry` so the Underwriter Workbench can inspect the live A2A wire exchange!

2. **LOS Underwriter Root A2A Service (`/a2a/los_underwriter`):**
   - **Discovery Endpoint:** `GET /a2a/los_underwriter/.well-known/agent-card.json`
   - **Task Endpoint:** `POST /a2a/los_underwriter` (JSON-RPC 2.0 `message/send` / `tasks/send`)
   - **Purpose:** Ready for registration with **Gemini Enterprise** via:
     ```bash
     agents-cli publish gemini \
       --agent-card-url https://<cloud-run-url>/a2a/los_underwriter/.well-known/agent-card.json \
       --gemini-app-id projects/$PROJECT_ID/locations/global/collections/default_collection/engines/$ENGINE_ID
     ```

---

### 4.3 Core Data Contracts (`backend/app/models/domain.py`)

All contracts use **Pydantic v2** with strict field constraints:

```python
from datetime import date, datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class ApplicationStatus(StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    KYC_VERIFICATION = "KYC_VERIFICATION"
    UNDERWRITING = "UNDERWRITING"
    AUTO_APPROVED = "AUTO_APPROVED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    APPROVED = "APPROVED"
    OFFER_GENERATED = "OFFER_GENERATED"
    DISBURSED = "DISBURSED"
    REJECTED = "REJECTED"


class EmploymentType(StrEnum):
    SALARIED = "SALARIED"
    SELF_EMPLOYED = "SELF_EMPLOYED"


class LoanPurpose(StrEnum):
    HOME_RENOVATION = "HOME_RENOVATION"
    WORKING_CAPITAL = "WORKING_CAPITAL"
    DEBT_CONSOLIDATION = "DEBT_CONSOLIDATION"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    EDUCATION = "EDUCATION"


class RuleOutcome(StrEnum):
    AUTO_APPROVE = "AUTO_APPROVE"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    AUTO_REJECT = "AUTO_REJECT"


class ApplicantProfile(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    dob: date
    tax_id: str = Field(..., pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
    employment_type: EmploymentType
    declared_monthly_income: float = Field(..., gt=0)


class LoanRequest(BaseModel):
    amount: float = Field(..., ge=100_000, le=5_000_000)  # ₹1L to ₹50L
    tenure_months: int = Field(..., ge=12, le=60)
    purpose: LoanPurpose


class DocumentExtractionResult(BaseModel):
    extracted_name: str
    extracted_dob: date
    extracted_tax_id: str
    id_confidence_score: float = Field(..., ge=0.0, le=1.0)
    average_monthly_balance: float = Field(..., ge=0)
    verified_monthly_income: float = Field(..., gt=0)
    existing_emi_outflow: float = Field(..., ge=0)
    inward_bounces_6m: int = Field(..., ge=0)
    tamper_flags: list[str] = Field(default_factory=list)


class KYCVerificationResult(BaseModel):
    name_similarity_score: float = Field(..., ge=0.0, le=100.0)
    dob_match: bool
    tax_id_match: bool
    watchlist_hit: bool
    is_existing_customer_delinquent: bool
    kyc_passed: bool
    failure_reasons: list[str] = Field(default_factory=list)


class BureauReport(BaseModel):
    bureau_score: int = Field(..., ge=300, le=900)
    active_tradelines: int = Field(..., ge=0)
    dpd_30_60_24m: int = Field(..., ge=0)
    dpd_90_plus_24m: int = Field(..., ge=0)
    recent_inquiries_6m: int = Field(..., ge=0)


class UnderwritingMetrics(BaseModel):
    applicant_age_years: int
    bureau_score: int
    declared_monthly_income: float
    verified_monthly_income: float
    income_variance_pct: float
    average_monthly_balance: float
    existing_emi_outflow: float
    proposed_emi: float
    annual_interest_rate_pct: float
    foir_percentage: float
    inward_bounces_6m: int
    dpd_30_60_24m: int
    dpd_90_plus_24m: int


class PolicyRuleResult(BaseModel):
    rule_id: str          # POL-01 .. POL-06
    metric_name: str
    actual_value: str
    outcome: RuleOutcome
    threshold_description: str
    adverse_action_code: str | None = None


class CounterOffer(BaseModel):
    recommended_amount: float
    recommended_tenure_months: int
    recommended_emi: float
    projected_foir: float
    rationale: str


class CreditAssessmentMemo(BaseModel):
    executive_summary: str
    strengths: list[str]
    risk_flags: list[str]
    mitigants: list[str]
    recommendationJustification: str


class KeyFactStatement(BaseModel):
    sanctioned_amount: float
    tenure_months: int
    annual_interest_rate_pct: float
    processing_fee_amount: float  # 1.5% of sanctioned_amount
    effective_apr_pct: float
    monthly_emi: float
    total_interest_payable: float
    total_amount_payable: float


class A2aExchangeRecord(BaseModel):
    exchange_id: str
    timestamp: datetime
    caller_agent: str
    target_agent: str
    agent_card_url: str
    protocol: str = "A2A-JSON-RPC-2.0"
    request_payload: dict
    response_payload: dict
    latency_ms: float


class AdkAgentStepExecution(BaseModel):
    agent_name: str
    agent_type: str       # "SequentialAgent" | "ParallelAgent" | "LlmAgent" | "RemoteA2aAgent"
    status: str           # "COMPLETED" | "PAUSED_HITL" | "FAILED"
    tool_calls: list[str]
    state_keys_written: list[str]
    duration_ms: float


class AuditLogEntry(BaseModel):
    timestamp: datetime
    actor: str            # "ADK_AGENT:<name>", "A2A_REMOTE:<name>", or credit officer ID
    action: str
    previous_status: ApplicationStatus | None
    new_status: ApplicationStatus
    policy_version: str
    details: dict
```

---

### 4.4 Deterministic Financial Calculator (`backend/app/services/financial_calculator.py`)

All mathematical computations are executed in Python (`TRD-08`, `TRD-11`) and invoked via ADK `FunctionTool`s:

1. **Risk-Based Pricing Tier (`compute_interest_rate_tier`):**
   - Score `>= 780`: `10.5%` APR
   - Score `750 – 779`: `11.5%` APR
   - Score `710 – 749`: `13.5%` APR
   - Score `680 – 709`: `15.5%` APR
   - Score `< 680`: `18.0%` APR

2. **Standard Reducing-Balance Monthly EMI (`compute_monthly_emi`):**
   $$\text{EMI} = P \cdot \frac{r(1 + r)^n}{(1 + r)^n - 1}$$
   where $P$ is principal (`amount`), $r = \frac{\text{APR}}{12 \times 100}$, and $n$ is `tenure_months`. Rounded to 2 decimal places.

3. **Fixed Obligation to Income Ratio (`compute_foir`):**
   $$\text{FOIR (\%)} = \left(\frac{\text{Existing Monthly EMIs} + \text{Proposed Loan EMI}}{\text{Verified Monthly Net Income}}\right) \times 100$$

4. **Income Variance (`compute_income_variance_pct`):**
   $$\text{Variance (\%)} = \left(\frac{|\text{Declared Income} - \text{Verified Income}|}{\text{Declared Income}}\right) \times 100$$

5. **Counter-Offer Optimizer (`compute_counter_offer`):**
   - Triggered when `FOIR > 45.0%` and no hard Non-FOIR knockout exists.
   - Solves for extended tenure (`48` or `60` months) and reduced principal (rounded to nearest `₹25,000`, e.g., `₹11,50,000` at `48` months yielding `47.2%` FOIR for the canonical `Rohan Deshmukh` persona) so that resulting $\text{FOIR} \le 48.0\%$.

---

### 4.5 Deterministic Credit Policy Engine (`backend/app/services/policy_engine.py`)

Implements the 6 baseline policy rules (`TRD-09`, `TRD-12`) with strict precedence:

| Rule ID | Metric | `AUTO_APPROVE` | `MANUAL_REVIEW` | `AUTO_REJECT` | Adverse Action Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POL-01` | `applicant_age_years` | `23 <= age <= 60` | `21 <= age <= 22` or `61 <= age <= 65` | `age < 21` or `age > 65` | `ERR_AGE_OUT_OF_BOUNDS` |
| `POL-02` | `bureau_score` | `score >= 750` | `680 <= score <= 749` | `score < 680` | `ERR_BUREAU_SCORE_LOW` |
| `POL-03` | `foir_percentage` | `foir <= 45.0` | `45.0 < foir <= 55.0` | `foir > 55.0` | `ERR_FOIR_EXCEEDED` |
| `POL-04` | `dpd_90_plus_24m` (& `dpd_30_60_24m`) | `dpd90 == 0` and `dpd30_60 == 0` | `dpd90 == 0` and `dpd30_60 == 1` | `dpd90 >= 1` or `dpd30_60 > 1` | `ERR_BUREAU_DELINQUENCY_HIGH` |
| `POL-05` | `inward_bounces_6m` | `bounces == 0` | `bounces == 1` | `bounces >= 2` | `ERR_BANK_BOUNCES_HIGH` |
| `POL-06` | `income_variance_pct` | `variance <= 10.0` | `10.0 < variance <= 25.0` | `variance > 25.0` | `ERR_INCOME_VARIANCE_CRITICAL` |

---

### 4.6 REST, SSE & A2A API Specification (`backend/app/api/routes.py`)

| Method | Path | Description | Request Body | Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Liveness, ADK Agent tree & A2A status check | — | `HealthResponse` |
| `GET` | `/a2a/los_underwriter/.well-known/agent-card.json` | **Inbound A2A Agent Card** for the LOS Root Orchestrator Agent | — | `AgentCard` (A2A Spec) |
| `POST` | `/a2a/los_underwriter` | **Inbound A2A JSON-RPC 2.0 Endpoint** (`message/send`, `tasks/send`) | `A2aJsonRpcRequest` | `A2aJsonRpcResponse` |
| `GET` | `/a2a/credit_bureau/.well-known/agent-card.json` | **Federated Credit Bureau A2A Agent Card** | — | `AgentCard` (A2A Spec) |
| `POST` | `/a2a/credit_bureau` | **Federated Credit Bureau A2A JSON-RPC 2.0 Endpoint** | `A2aJsonRpcRequest` | `A2aJsonRpcResponse` |
| `GET` | `/api/v1/personas` | List pre-baked demo personas (STP, Grey-Zone, Knockout Reject) | — | `list[DemoPersonaPreset]` |
| `GET` | `/api/v1/applications` | List all applications (with masked PII `XXXXX1234F`) | — | `list[ApplicationSummary]` |
| `POST` | `/api/v1/applications` | Create application (`DRAFT` or from `persona_id`) | `CreateApplicationRequest` | `LoanApplication` |
| `GET` | `/api/v1/applications/{id}` | Fetch full state, ADK agent steps, A2A telemetry, metrics, rules, CAM, KFS & audit log | — | `LoanApplication` |
| `POST` | `/api/v1/applications/{id}/documents` | Upload PDF/image docs into ADK `ArtifactService` | `DocumentBundleRequest` | `LoanApplication` |
| `POST` | `/api/v1/applications/{id}/evaluate` | Execute ADK `Runner` (`SequentialAgent` -> `ParallelAgent` + A2A -> Policy -> CAM) | — | `LoanApplication` |
| `POST` | `/api/v1/applications/{id}/simulate-counter` | Recalculate FOIR, EMI, and rule scorecard for custom amount/tenure | `CounterOfferSimulationRequest` | `CounterOfferSimulationResponse` |
| `POST` | `/api/v1/applications/{id}/decision` | Resume ADK HITL gate (`APPROVE`, `APPROVE_COUNTER`, `REJECT`) | `UnderwriterDecisionRequest` | `LoanApplication` |
| `POST` | `/api/v1/applications/{id}/accept-offer` | Borrower e-Signs KFS and triggers `DISBURSED` state | `AcceptOfferRequest` | `LoanApplication` |
| `GET` | `/api/v1/applications/{id}/events` | Server-Sent Events (SSE) stream of ADK `Event`s & A2A exchanges | — | `text/event-stream` |

---

## 5. Pre-Baked Demo Personas (`backend/app/data/personas.py`)

| Persona ID | Applicant Name | Profile Summary | Key Metrics | Expected Routing Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `persona_stp_clean` | **Ananya Kulkarni** (Salaried) | ₹8L Loan, 36m tenure, ₹1.45L verified monthly income | Age `32`, Bureau `792`, FOIR `24.1%`, `0` DPD, `0` Bounces, `0%` Income Variance | **`AUTO_APPROVED`** (STP `< 5s`, 10.5% APR, KFS generated immediately) |
| `persona_grey_counter` | **Rohan Deshmukh** (Salaried — *BRD Canonical*) | ₹15L Loan, 36m tenure, ₹1.20L declared / ₹1.15L verified income | Age `35`, Bureau `732` (`MANUAL_REVIEW`), FOIR `58.95%` (`> 55%` cap), `0` DPD, `0` Bounces | **`MANUAL_REVIEW`** with AI Counter-Offer (`₹11.5L` @ `48m` -> Projected FOIR `47.2%`) |
| `persona_reject_knockout` | **Vikramaditya Joshi** (Self-Employed SME) | ₹25L Loan, 24m tenure, ₹2.00L declared / ₹1.10L verified income | Age `41`, Bureau `615` (`< 680`), FOIR `132%`, `2` 90+ DPD, `3` Check Bounces, `45%` Variance | **`REJECTED`** (Multiple hard knockouts + Adverse Action Notice codes) |

---

## 6. Frontend Technical Architecture

1. **Stack & Tooling:**
   - Vite + React 19 + TypeScript (`strict: true`), managed with `bun` and linted/formatted with `biome`.
   - Styling in `src/styles/globals.css` using **OKLCH** color variables (`oklch(...)`), soft low-glare off-white light surfaces, deep slate dark mode, subtle surface grain, and semantic status badges.
2. **Core Interactive Views & ADK/A2A Visualizers:**
   - **Header Bar:** Application switcher, Role View switcher (`Borrower Portal` vs. `Underwriter Workbench`), **A2A Agent Cards & Protocol Inspector button**, Live ADK SSE status pill, and Light/Dark theme toggle.
   - **Borrower Portal (`View 1`):**
     - **Persona Quick-Fill Bar:** 3 cards (`Clean STP`, `Grey-Zone Counter-Offer`, `Hard Knockout Reject`) that populate form + ADK `ArtifactService` document bundle in 1 click.
     - **Intake Form & Document Checklist:** Interactive inputs for Name, DOB, PAN, Employment, Income, Loan Amount, Tenure, Purpose, and Document Upload status.
     - **Live Status & Offer / KFS Panel:** Real-time ADK agent progress; displays the **Key Fact Statement (KFS)** with 1-click e-Sign (`DISBURSED`), the **Counter-Offer Acceptance Card**, or the **Adverse Action Notice**.
   - **Underwriter Workbench (`View 2`):**
     - **ADK Multi-Agent & A2A Topology Visualizer (`AdkPipelineGraph.tsx`):** Shows the live execution of `los_orchestrator_agent` (`SequentialAgent`), the 3 concurrent branches of `parallel_verification_stage` (`kyc_fraud_agent`, `financial_spreading_agent`, and the **A2A JSON-RPC call** to `credit_bureau_a2a_server`), `deterministic_policy_agent`, and `cam_synthesizer_agent` with per-agent latency, tool calls, and `session.state` keys written.
     - **A2A Protocol Inspector Modal (`A2aInspectorModal.tsx`):** Displays the live `/.well-known/agent-card.json` discovery manifests for both `los_underwriter` and `credit_bureau`, plus the actual A2A JSON-RPC 2.0 request/response payloads and `agents-cli publish gemini` CLI snippet.
     - **Policy Scorecard Matrix (`POL-01` – `POL-06`):** Visual table comparing Applicant Actuals vs. Auto-Approve / Grey-Zone / Reject thresholds.
     - **Interactive Counter-Offer Simulator & HITL Decision Bar:** Sliders for Loan Amount and Tenure that call `/simulate-counter` live, paired with 1-click **Approve Counter-Offer**, **Override & Approve**, or **Reject** actions that resume the ADK HITL state.

---

## 7. Requirements Traceability Matrix (BRD <-> TRD)

| BRD ID | Requirement Summary | TRD ID | Implementing Backend Module | Implementing Frontend Component | Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FR-01` | Loan Parameters & Borrower Profile | `TRD-01` | `models/domain.py::ApplicantProfile, LoanRequest` | `ApplicationForm.tsx`, `PersonaSelector.tsx` | `test_api_flow.py::test_create_application` |
| `FR-02` | Document Upload to ADK `ArtifactService` | `TRD-02` | `services/orchestrator.py`, `api/routes.py` | `ApplicationForm.tsx` | `test_api_flow.py::test_upload_documents` |
| `FR-03` | Identity Extraction & `>= 85%` Match | `TRD-03` | `agent.py::kyc_fraud_agent`, `services/kyc_service.py` | `DocSpreadViewer.tsx` | `test_adk_a2a_pipeline.py::test_kyc_agent` |
| `FR-04` | Deduplication & Watchlist Screening | `TRD-04` | `services/kyc_service.py::check_watchlist` | `DocSpreadViewer.tsx` | `test_api_flow.py::test_watchlist_knockout` |
| `FR-05` | Bank Statement Analysis (AMB, EMI, Bounces) | `TRD-05` | `agent.py::financial_spreading_agent`, `services/document_parser.py` | `DocSpreadViewer.tsx` | `test_adk_a2a_pipeline.py::test_spreading_agent` |
| `FR-06` | Tamper & Income Variance Detection | `TRD-06` | `services/financial_calculator.py::compute_income_variance_pct` | `DocSpreadViewer.tsx` | `test_financial_calculator.py::test_income_variance` |
| `FR-07` | Federated Credit Bureau Pull via **A2A Protocol** | `TRD-07`, `TRD-A2A-01` | `a2a_bureau_server.py`, `agent.py::credit_bureau_a2a_bridge` | `AdkPipelineGraph.tsx`, `A2aInspectorModal.tsx` | `test_adk_a2a_pipeline.py::test_a2a_bureau_card_and_rpc` |
| `FR-08` | Deterministic FOIR & EMI `FunctionTool` | `TRD-08` | `services/financial_calculator.py`, `agent.py::deterministic_policy_agent` | `CounterOfferSim.tsx` | `test_financial_calculator.py::test_emi_and_foir` |
| `FR-09` | Deterministic Decision Matrix (`POL-01..06`) | `TRD-09` | `services/policy_engine.py`, `agent.py::deterministic_policy_agent` | `RuleScorecard.tsx` | `test_policy_engine.py::test_all_policy_rules` |
| `FR-10` | AI Credit Assessment Memo (`cam_synthesizer_agent`) | `TRD-10` | `agent.py::cam_synthesizer_agent`, `services/cam_generator.py` | `CreditMemoPanel.tsx` | `test_adk_a2a_pipeline.py::test_full_adk_pipeline` |
| `FR-11` | Risk Pricing, KFS & Counter-Offer | `TRD-11` | `services/financial_calculator.py::generate_kfs, compute_counter_offer` | `SanctionKfsCard.tsx`, `CounterOfferSim.tsx` | `test_financial_calculator.py::test_counter_offer_and_kfs` |
| `FR-12` | Standardized Adverse Action Codes | `TRD-12` | `services/policy_engine.py::evaluate_credit_policy` | `RuleScorecard.tsx`, `SanctionKfsCard.tsx` | `test_policy_engine.py::test_adverse_action_codes` |
| `ADK / A2A` | Multi-Agent ADK, Callbacks, Inbound/Outbound A2A Cards | `TRD-ADK-01`, `TRD-A2A-02` | `agent.py`, `callbacks.py`, `a2a_bureau_server.py` | `AdkPipelineGraph.tsx`, `A2aInspectorModal.tsx` | `test_adk_a2a_pipeline.py::test_los_underwriter_a2a_card` |
| `NFR-01..04` | Determinism, ADK Callback Audit, PII Masking, Latency | `TRD-NFR-01..04` | `callbacks.py`, `services/orchestrator.py` | `AuditTimeline.tsx` | `test_api_flow.py::test_pii_masking_and_audit_log` |
