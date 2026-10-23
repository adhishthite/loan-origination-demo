# Retail & SME Loan Origination System (LOS) — Google ADK & A2A Showcase

An automated, AI-augmented **Loan Origination System (LOS)** for unsecured retail and micro-SME working capital loans powered by **Google Agent Development Kit (`google-adk`)**, **Google Gemini Agent Platform**, and the **Agent-to-Agent (`A2A`) protocol**.

## Key Google Gemini Agent Platform & ADK Features Demonstrated

1. **Multi-Agent Workflow Orchestration (`SequentialAgent` & `ParallelAgent`)**:
   - `los_orchestrator_agent` (`SequentialAgent`) coordinates `parallel_verification_stage` (`ParallelAgent` running `kyc_fraud_agent`, `financial_spreading_agent`, and `credit_bureau_a2a_bridge` concurrently), followed by `deterministic_policy_agent` and `cam_synthesizer_agent`.
2. **Bidirectional Agent-to-Agent (`A2A`) Protocol (`/.well-known/agent-card.json` & JSON-RPC 2.0)**:
   - **Outbound A2A Federation**: Queries a federated **Credit Bureau & Fraud Consortium A2A Agent** (`/a2a/credit_bureau/.well-known/agent-card.json`) over A2A JSON-RPC.
   - **Inbound A2A Exposure**: Exposes the LOS Underwriter itself as an A2A service (`/a2a/los_underwriter/.well-known/agent-card.json`) ready for registration with **Gemini Enterprise** (`agents-cli publish gemini`) or invocation by Branch RM agents.
3. **Strict Separation of Multimodal LLM Agents vs. Deterministic `FunctionTool`s**:
   - Gemini (`gemini-2.5-flash`) performs multimodal document extraction and Credit Assessment Memo (CAM) synthesis, while 100% deterministic Python `FunctionTool`s compute `EMI`, `FOIR`, Counter-Offers, and `POL-01`–`POL-06` credit policy rules inside `tool_context.state`.
4. **ADK Guardrail Callbacks, Artifact Storage & HITL Resumability**:
   - Uses `InMemoryArtifactService` (or `GcsArtifactService`) for borrower documents, `before_model_callback` for PAN/Account PII masking (`XXXXX1234F`), `after_tool_callback` for immutable audit logging, and `ResumabilityConfig` for Credit Officer Human-in-the-Loop (`MANUAL_REVIEW`) approval gates.

## Specifications

- **[Business Requirements Document (`0-spec/BRD.md`)](./0-spec/BRD.md)**: Personas, origination state machine, functional requirements (`FR-01` – `FR-12`), credit policy rules (`POL-01` – `POL-06`), and ADK/A2A platform showcase matrix.
- **[Technical Requirements Document (`0-spec/TRD.md`)](./0-spec/TRD.md)**: Multi-agent ADK & A2A system architecture, directory layout, Pydantic v2 data contracts, deterministic financial formulas, A2A Agent Cards, REST/SSE API specification, and 1:1 traceability matrix.

## Architecture & Tech Stack (`standalone-stack`)

- **Backend (`backend/`)**: Python 3.12+, FastAPI, `google-adk`, `a2a-sdk`, `google-genai` SDK (`gemini-2.5-flash`), Pydantic v2, managed via `uv` and linted/formatted with `ruff`.
- **Frontend (`frontend/`)**: Vite + React 19 + TypeScript, ShadCN UI primitives, OKLCH color system with light/dark mode, live ADK Agent & A2A Protocol Inspector, managed via `bun` and linted/formatted with `biome`.
- **Orchestration (`Makefile`)**: Unified targets across root, `backend/`, and `frontend/`.

## Quickstart

```bash
# Run full formatting, linting, and unit/integration/ADK+A2A test suites
make check

# Start both backend (port 8000) and frontend (port 5173) in development mode
make dev
```

## Makefile Targets

| Target | Description |
| :--- | :--- |
| `make dev` | Start backend (`uvicorn --reload`) and frontend (`bun run dev`) concurrently |
| `make start` | Start production backend and frontend servers |
| `make test` | Run backend `pytest` suite (including ADK & A2A protocol tests) and frontend checks |
| `make format` | Format code using `ruff format` (backend) and `biome format --write` (frontend) |
| `make lint` | Lint code using `ruff check` (backend) and `biome check` (frontend) |
| `make clean` | Clean build artifacts, caches, and temporary files |
| `make check` | Full verification pipeline: `format` -> `lint` -> `test` |
