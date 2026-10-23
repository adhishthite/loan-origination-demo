SHELL := /bin/bash

.PHONY: help install dev start test lint format clean check

help:
	@echo "AI-Augmented Loan Origination System (LOS) Demo"
	@echo ""
	@echo "Targets:"
	@echo "  make install  - Install backend (uv) and frontend (bun) dependencies"
	@echo "  make dev      - Start both backend (FastAPI :8000) and frontend (Vite :5173)"
	@echo "  make test     - Run backend and frontend test suites"
	@echo "  make lint     - Run linters (ruff + biome)"
	@echo "  make format   - Run formatters (ruff + biome)"
	@echo "  make clean    - Clean build caches and temporary files"
	@echo "  make check    - Full verification: format -> lint -> test"

install:
	@echo "==> Installing backend dependencies with uv..."
	@cd backend && uv sync
	@echo "==> Installing frontend dependencies with bun..."
	@cd frontend && bun install

dev:
	@echo "==> Starting backend and frontend in development mode..."
	@trap 'kill 0' EXIT; \
	(cd backend && uv run uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && bun run dev) & \
	wait

start: dev

test:
	@echo "==> Running backend tests..."
	@cd backend && uv run pytest
	@echo "==> Running frontend checks..."
	@cd frontend && bun run build

lint:
	@echo "==> Linting backend with ruff..."
	@cd backend && uv run ruff check .
	@echo "==> Linting frontend with biome..."
	@cd frontend && bun run lint

format:
	@echo "==> Formatting backend with ruff..."
	@cd backend && uv run ruff format .
	@echo "==> Formatting frontend with biome..."
	@cd frontend && bun run format

clean:
	@echo "==> Cleaning caches..."
	@rm -rf backend/.ruff_cache backend/.pytest_cache backend/**/__pycache__
	@rm -rf frontend/dist frontend/.turbo

check: format lint test
