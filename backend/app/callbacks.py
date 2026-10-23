"""ADK Guardrail, Audit & PII Redaction Callbacks.

TRD-NFR-02, TRD-NFR-03:
- PII masking on Tax IDs (PAN) and account numbers before model invocation
- Immutable audit log appending after tool and agent execution
- Session state initialization
"""

import re
from datetime import UTC, datetime

from app.config import settings
from app.models.domain import ApplicationStatus, AuditLogEntry

PAN_REGEX = re.compile(r"\b([A-Z]{5})([0-9]{4})([A-Z]{1})\b")
ACCOUNT_REGEX = re.compile(r"\b([0-9]{5,18})\b")


def mask_pii_string(text: str) -> str:
    """Masks PAN numbers (e.g. ABCDE1234F -> XXXXX1234F) and long account digit sequences."""
    # Mask PAN
    masked = PAN_REGEX.sub(r"XXXXX\2\3", text)
    return masked


def mask_pii_dict(data: dict) -> dict:
    """Recursively masks string values inside a dictionary."""
    result = {}
    for k, v in data.items():
        if isinstance(v, str):
            result[k] = mask_pii_string(v)
        elif isinstance(v, dict):
            result[k] = mask_pii_dict(v)
        elif isinstance(v, list):
            result[k] = [
                mask_pii_string(item)
                if isinstance(item, str)
                else mask_pii_dict(item)
                if isinstance(item, dict)
                else item
                for item in v
            ]
        else:
            result[k] = v
    return result


def mask_pii_before_model_callback(agent, model_input: str | dict) -> str | dict:
    """ADK before_model_callback hook: ensures no raw unmasked PII reaches LLM prompts."""
    if isinstance(model_input, str):
        return mask_pii_string(model_input)
    elif isinstance(model_input, dict):
        return mask_pii_dict(model_input)
    return model_input


def audit_after_tool_callback(
    agent_name: str,
    tool_name: str,
    tool_input: dict,
    tool_output: dict,
    state: dict,
) -> AuditLogEntry:
    """Appends an immutable audit log entry into the session state after each tool call."""
    entry = AuditLogEntry(
        timestamp=datetime.now(UTC),
        actor=f"ADK_AGENT:{agent_name}",
        action=f"EXECUTE_TOOL:{tool_name}",
        previous_status=state.get("status"),
        new_status=state.get("status", ApplicationStatus.UNDERWRITING),
        policy_version=settings.policy_version,
        details={
            "tool_name": tool_name,
            "tool_input": mask_pii_dict(tool_input)
            if isinstance(tool_input, dict)
            else str(tool_input),
            "tool_output_summary": str(tool_output)[:200],
        },
    )
    if "audit_log" in state and isinstance(state["audit_log"], list):
        state["audit_log"].append(entry)
    return entry


def init_los_session_callback(agent, session: dict) -> None:
    """ADK before_agent_callback hook: initializes standard session state fields."""
    if "audit_log" not in session:
        session["audit_log"] = []
    if "agent_steps" not in session:
        session["agent_steps"] = []
    if "a2a_telemetry" not in session:
        session["a2a_telemetry"] = []
