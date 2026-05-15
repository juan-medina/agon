.PHONY: web test lint build setup db-init db-start db-stop

web:
	cd web && pnpm dev

test:
	cd web && pnpm test

lint:
	cd web && pnpm lint

build:
	cd web && pnpm build

setup:
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

db-init:
	powershell -ExecutionPolicy Bypass -File scripts/db-init.ps1

db-start:
	powershell -ExecutionPolicy Bypass -File scripts/db-start.ps1

db-stop:
	powershell -ExecutionPolicy Bypass -File scripts/db-stop.ps1
