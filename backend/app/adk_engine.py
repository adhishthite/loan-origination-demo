"""Google Agent Development Kit (ADK) Engine.

Provides standard ADK primitives conforming to the google-adk architecture:
- ToolContext, FunctionTool
- Agent (LlmAgent), ParallelAgent, SequentialAgent
- App, ResumabilityConfig, Runner, InMemorySessionService, InMemoryArtifactService
"""

import asyncio
import inspect
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.models.domain import AdkAgentStepExecution


@dataclass
class ToolContext:
    session_id: str
    state: dict[str, Any] = field(default_factory=dict)
    artifacts: dict[str, Any] = field(default_factory=dict)


class FunctionTool:
    def __init__(self, func: Callable, name: str | None = None, description: str | None = None):
        self.func = func
        self.name = name or func.__name__
        self.description = description or func.__doc__ or f"Tool executing {self.name}"

    async def execute(self, context: ToolContext, **kwargs) -> Any:
        # Check if function takes tool_context or context
        sig = inspect.signature(self.func)
        call_kwargs = {}
        for param in sig.parameters.values():
            if param.name in ("tool_context", "context"):
                call_kwargs[param.name] = context
            elif param.name in kwargs:
                call_kwargs[param.name] = kwargs[param.name]

        if inspect.iscoroutinefunction(self.func):
            return await self.func(**call_kwargs)
        else:
            return self.func(**call_kwargs)


class Agent:
    def __init__(
        self,
        name: str,
        model: str = "gemini-3.8-flash",
        description: str = "",
        instruction: str = "",
        tools: list[FunctionTool] | None = None,
        output_key: str | None = None,
        before_model_callback: Callable | None = None,
        after_tool_callback: Callable | None = None,
    ):
        self.name = name
        self.model = model
        self.description = description
        self.instruction = instruction
        self.tools = tools or []
        self.output_key = output_key
        self.before_model_callback = before_model_callback
        self.after_tool_callback = after_tool_callback

    async def run(
        self,
        context: ToolContext,
        event_emitter: Callable[[str, dict], Any] | None = None,
    ) -> Any:
        start_time = time.perf_counter()
        tool_call_names: list[str] = []
        keys_before = set(context.state.keys())

        if event_emitter:
            await event_emitter(
                "agent_start",
                {
                    "agent_name": self.name,
                    "agent_type": "LlmAgent",
                    "model": self.model,
                    "description": self.description,
                },
            )

        output = None
        # Execute associated tools sequentially
        for tool in self.tools:
            tool_call_names.append(tool.name)
            if event_emitter:
                await event_emitter(
                    "tool_start",
                    {"agent_name": self.name, "tool_name": tool.name},
                )

            tool_result = await tool.execute(context)
            output = tool_result

            # Trigger after_tool_callback if provided
            if self.after_tool_callback:
                self.after_tool_callback(
                    agent_name=self.name,
                    tool_name=tool.name,
                    tool_input={},
                    tool_output=tool_result
                    if isinstance(tool_result, dict)
                    else {"output": str(tool_result)},
                    state=context.state,
                )

            if event_emitter:
                await event_emitter(
                    "tool_complete",
                    {
                        "agent_name": self.name,
                        "tool_name": tool.name,
                        "output_summary": str(tool_result)[:100],
                    },
                )

        if self.output_key and output is not None:
            context.state[self.output_key] = output

        keys_written = list(set(context.state.keys()) - keys_before)
        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        step_record = AdkAgentStepExecution(
            agent_name=self.name,
            agent_type="LlmAgent",
            status="COMPLETED",
            tool_calls=tool_call_names,
            state_keys_written=keys_written,
            duration_ms=duration_ms,
        )
        if "agent_steps" in context.state and isinstance(context.state["agent_steps"], list):
            context.state["agent_steps"].append(step_record)

        if event_emitter:
            await event_emitter(
                "agent_complete",
                {
                    "agent_name": self.name,
                    "duration_ms": duration_ms,
                    "tools": tool_call_names,
                    "keys_written": keys_written,
                },
            )

        return output


class ParallelAgent:
    def __init__(
        self,
        name: str,
        description: str = "",
        sub_agents: list[Agent | Any] | None = None,
    ):
        self.name = name
        self.description = description
        self.sub_agents = sub_agents or []

    async def run(
        self,
        context: ToolContext,
        event_emitter: Callable[[str, dict], Any] | None = None,
    ) -> list[Any]:
        start_time = time.perf_counter()
        if event_emitter:
            await event_emitter(
                "parallel_stage_start",
                {
                    "stage_name": self.name,
                    "sub_agents": [a.name for a in self.sub_agents],
                },
            )

        # Run all sub-agents concurrently
        tasks = [agent.run(context, event_emitter) for agent in self.sub_agents]
        results = await asyncio.gather(*tasks)

        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        step_record = AdkAgentStepExecution(
            agent_name=self.name,
            agent_type="ParallelAgent",
            status="COMPLETED",
            tool_calls=[],
            state_keys_written=[],
            duration_ms=duration_ms,
        )
        if "agent_steps" in context.state and isinstance(context.state["agent_steps"], list):
            context.state["agent_steps"].append(step_record)

        if event_emitter:
            await event_emitter(
                "parallel_stage_complete",
                {"stage_name": self.name, "duration_ms": duration_ms},
            )

        return results


class SequentialAgent:
    def __init__(
        self,
        name: str,
        description: str = "",
        sub_agents: list[Agent | ParallelAgent | Any] | None = None,
        before_agent_callback: Callable | None = None,
    ):
        self.name = name
        self.description = description
        self.sub_agents = sub_agents or []
        self.before_agent_callback = before_agent_callback

    async def run(
        self,
        context: ToolContext,
        event_emitter: Callable[[str, dict], Any] | None = None,
    ) -> Any:
        start_time = time.perf_counter()
        if self.before_agent_callback:
            self.before_agent_callback(self, context.state)

        if event_emitter:
            await event_emitter(
                "workflow_start",
                {
                    "orchestrator": self.name,
                    "description": self.description,
                    "steps": [a.name for a in self.sub_agents],
                },
            )

        last_result = None
        for agent in self.sub_agents:
            last_result = await agent.run(context, event_emitter)

        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        step_record = AdkAgentStepExecution(
            agent_name=self.name,
            agent_type="SequentialAgent",
            status="COMPLETED",
            tool_calls=[],
            state_keys_written=[],
            duration_ms=duration_ms,
        )
        if "agent_steps" in context.state and isinstance(context.state["agent_steps"], list):
            context.state["agent_steps"].append(step_record)

        if event_emitter:
            await event_emitter(
                "workflow_complete",
                {"orchestrator": self.name, "total_duration_ms": duration_ms},
            )

        return last_result


@dataclass
class ResumabilityConfig:
    is_resumable: bool = True


class App:
    def __init__(
        self,
        name: str,
        root_agent: SequentialAgent | Agent,
        resumability_config: ResumabilityConfig | None = None,
    ):
        self.name = name
        self.root_agent = root_agent
        self.resumability_config = resumability_config or ResumabilityConfig()


class InMemoryArtifactService:
    def __init__(self):
        self._artifacts: dict[str, dict[str, Any]] = {}

    def save_artifact(self, session_id: str, key: str, artifact: Any) -> None:
        if session_id not in self._artifacts:
            self._artifacts[session_id] = {}
        self._artifacts[session_id][key] = artifact

    def get_artifact(self, session_id: str, key: str) -> Any | None:
        return self._artifacts.get(session_id, {}).get(key)


class InMemorySessionService:
    def __init__(self):
        self._sessions: dict[str, dict[str, Any]] = {}

    def get_or_create_session(self, session_id: str) -> dict[str, Any]:
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "session_id": session_id,
                "created_at": datetime.now(UTC).isoformat(),
                "state": {},
            }
        return self._sessions[session_id]

    def update_session_state(self, session_id: str, state_update: dict[str, Any]) -> None:
        session = self.get_or_create_session(session_id)
        session["state"].update(state_update)


class Runner:
    def __init__(
        self,
        app: App,
        session_service: InMemorySessionService | None = None,
        artifact_service: InMemoryArtifactService | None = None,
    ):
        self.app = app
        self.session_service = session_service or InMemorySessionService()
        self.artifact_service = artifact_service or InMemoryArtifactService()

    async def run_async(
        self,
        session_id: str,
        initial_state: dict[str, Any],
        event_emitter: Callable[[str, dict], Any] | None = None,
    ) -> ToolContext:
        session = self.session_service.get_or_create_session(session_id)
        session["state"].update(initial_state)

        context = ToolContext(
            session_id=session_id,
            state=session["state"],
            artifacts=self.artifact_service._artifacts.get(session_id, {}),
        )

        await self.app.root_agent.run(context, event_emitter)
        return context
