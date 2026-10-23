SHELL := /bin/bash

.PHONY: install dev run format lint clean check build

install:
	bun install

dev:
	bun run dev

run:
	bun run dev

build:
	bun run build

format:
	bun run format

lint:
	bun run lint

clean:
	rm -rf dist .turbo node_modules/.vite

check: format lint build
