SHELL := /bin/bash

.PHONY: help install dev run start test lint format clean check

help:
	@echo "LOS Backend Makefile"
	@echo "Targets:"
	@echo "  make install  - Install dependencies via uv"
	@echo "  make dev      - Run FastAPI server with auto-reload"
	@echo "  make run      - Run FastAPI server"
	@echo "  make test     - Run pytest suite"
	@echo "  make lint     - Run ruff check"
	@echo "  make format   - Run ruff format"
	@echo "  make clean    - Remove cache directories"
	@echo "  make check    - Full pipeline: format -> lint -> test"

install:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --port 8000

run:
	uv run uvicorn app.main:app --port 8000

start: run

test:
	uv run pytest -v

lint:
	uv run ruff check .

format:
	uv run ruff format .

clean:
	rm -rf .ruff_cache .pytest_cache `find . -type d -name __pycache__`

check: format lint test
