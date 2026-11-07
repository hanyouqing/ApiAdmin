.PHONY: help build run test test-coverage test-verbose test-package e2e demo-lifecycle swagger migrate migrate-status migrate-down clean frontend backend start stop free-ports backup restore config-backup config-restore deps install seed-demo reset-password fmt format-check lint check docker docker-up docker-down mongo-up mongo-down audit tg-init tg-plan tg-apply tg-lint

.DEFAULT_GOAL := help

BACKUP_DIR ?= ./backups
COMPOSE ?= docker-compose
MONGO_CONTAINER ?= apiadmin-mongo
MONGO_IMAGE ?= mongo:7
MONGO_PORT ?= 27017
EMAIL ?= demo@apiadmin.local
PASSWORD ?= Demo1234!
CREATE ?= 0
DEV_PORTS ?= 3000 3001 3002
ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

# Show available targets
help:
	@echo "ApiAdmin — Available targets:"
	@echo ""
	@awk '/^# /{sub(/^# /, ""); desc=$$0; next} /^[a-zA-Z0-9_-]+:/{gsub(/:.*/, ""); if(desc) printf "  \033[36m%-18s\033[0m %s\n", $$0, desc; desc=""; next} {desc=""}' $(MAKEFILE_LIST)
	@echo ""

# Install all dependencies (root + Client + Server)
install:
	SKIP_PREINSTALL=true npm install
	cd Client && npm install
	cd Server && PUPPETEER_SKIP_DOWNLOAD=true npm install

# Seed demo user/group/project + import examples/openapi-petstore-mini.json
seed-demo:
	cd Server && npx tsx scripts/seed-demo.mjs

# Reset local user password — make reset-password [EMAIL=...] [PASSWORD=...] [CREATE=1]
reset-password:
	@cd Server && EMAIL="$(EMAIL)" PASSWORD="$(PASSWORD)" CREATE="$(CREATE)" npx tsx scripts/reset-password.mjs

# Alias of install
deps: install

# Build client and server for production
build:
	npm run build

# Build Docker image
docker:
	bash Scripts/build-docker.sh

# Start stack with docker-compose
docker-up:
	$(COMPOSE) up -d --build

# Stop docker-compose stack
docker-down:
	$(COMPOSE) down

# Run application (alias of start)
run: start

# Ensure local MongoDB Docker container is up (no auth; matches default MONGODB_URL)
mongo-up:
	@command -v docker >/dev/null || { echo "❌ docker is required for local MongoDB"; exit 1; }
	@if ! docker inspect $(MONGO_CONTAINER) >/dev/null 2>&1; then \
		echo "▶️  Creating MongoDB container $(MONGO_CONTAINER) on 127.0.0.1:$(MONGO_PORT)..."; \
		docker run -d --name $(MONGO_CONTAINER) \
			-p 127.0.0.1:$(MONGO_PORT):27017 \
			-v $(MONGO_CONTAINER)-data:/data/db \
			$(MONGO_IMAGE) >/dev/null; \
	elif [ "$$(docker inspect -f '{{.State.Running}}' $(MONGO_CONTAINER))" != "true" ]; then \
		echo "▶️  Starting existing MongoDB container $(MONGO_CONTAINER)..."; \
		docker start $(MONGO_CONTAINER) >/dev/null; \
	else \
		echo "✅ MongoDB container $(MONGO_CONTAINER) already running"; \
	fi
	@for i in $$(seq 1 30); do \
		if docker exec $(MONGO_CONTAINER) mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1; then \
			echo "✅ MongoDB ready at mongodb://127.0.0.1:$(MONGO_PORT)/apiadmin"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "❌ MongoDB container did not become ready"; exit 1

# Stop local MongoDB Docker container (data volume kept)
mongo-down:
	@if [ "$$(docker inspect -f '{{.State.Running}}' $(MONGO_CONTAINER) 2>/dev/null)" = "true" ]; then \
		docker stop $(MONGO_CONTAINER) >/dev/null && echo "✅ Stopped $(MONGO_CONTAINER)"; \
	else \
		echo "ℹ️  $(MONGO_CONTAINER) is not running"; \
	fi

# Free local Vite/API ports and stop ApiAdmin concurrent/tsx/vite processes
free-ports:
	@echo "▶️  Stopping ApiAdmin dev processes…"
	@-pkill -f "$(ROOT_DIR)/.*concurrently" 2>/dev/null || true
	@-pkill -f "$(ROOT_DIR)/.*tsx watch App" 2>/dev/null || true
	@-pkill -f "$(ROOT_DIR)/Client/.*vite" 2>/dev/null || true
	@for port in $(DEV_PORTS); do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			echo "▶️  Killing listeners on $$port: $$pids"; \
			kill $$pids 2>/dev/null || true; \
		fi; \
	done
	@sleep 1
	@busy=0; \
	for port in $(DEV_PORTS); do \
		if lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "❌ Port $$port still in use"; busy=1; \
		else \
			echo "✅ Port $$port free"; \
		fi; \
	done; \
	if [ "$$busy" -ne 0 ]; then exit 1; fi

# Alias of free-ports
stop: free-ports

# Run frontend dev server (Vite)
frontend:
	cd Client && npm run dev

# Run backend dev server (starts local MongoDB container first)
backend: mongo-up
	cd Server && npm run dev

# Run both frontend and backend in development (starts local MongoDB container first)
start: mongo-up
	npm run dev

# Run unit tests (uses in-memory MongoDB via vitest setup)
test:
	npm test -- --run

# Newman-like CLI help
cli:
	node tools/apiadmin-cli.mjs

# Run tests with coverage
test-coverage:
	npm run test:coverage -- --run
	@echo "Coverage report generated under coverage/"

# Run tests with verbose output
test-verbose:
	npx vitest run --reporter=verbose

# Run end-to-end tests (Playwright)
e2e:
	npm run test:e2e

# Phase 1 lifecycle demo against a running API (needs APIADMIN_EMAIL / APIADMIN_PASSWORD)
demo-lifecycle:
	./Scripts/demo-lifecycle.sh

# Run a single vitest file — Usage: make test-package FILE=tests/unit/Security.test.js
test-package:
	@if [ -z "$(FILE)" ]; then echo "❌ Usage: make test-package FILE=tests/unit/Security.test.js"; exit 1; fi
	npx vitest run $(FILE)

# Show Swagger / OpenAPI endpoints
swagger:
	@echo "OpenAPI JSON (always on):"
	@echo "  http://localhost:$${PORT:-3000}/swagger.json"
	@echo "Swagger UI (optional): set SWAGGER_ENABLED=true and restart, then open:"
	@echo "  http://localhost:$${PORT:-3000}/swagger"
	@echo "URL import accepts /swagger and maps it to /swagger.json on the server."
	@echo "UI IP allowlist: $${SWAGGER_ALLOWED_IP_ADDRESSES:-(open when unset)}"

# Initialize MongoDB (indexes / app DB user) — ApiAdmin uses schema-on-write
migrate:
	bash Scripts/init-mongodb.sh

# Show MongoDB connectivity / collection status
migrate-status:
	bash Scripts/mongo-status.sh

# Placeholder for SQL-style down migrations (not used with Mongo schemas)
migrate-down:
	@echo "⚠️  ApiAdmin uses MongoDB schemas without versioned down migrations."
	@echo "   Use: make restore FILE=./backups/... to roll data back."

# Clean build artifacts and coverage
clean:
	rm -rf Client/dist Server/dist coverage playwright-report test-results
	rm -rf Static/assets 2>/dev/null || true
	@echo "✅ Clean complete"

# Format code with Prettier
fmt:
	npm run format

# Lint code with ESLint
lint:
	npm run lint

# Run format, lint, and unit tests
check: format-check lint test

# Prettier check only (no write)
format-check:
	npm run format:check

# Run npm security audits (root + Client + Server)
audit:
	npm audit
	cd Client && npm audit
	cd Server && npm audit

# Database backup (mongodump) — Usage: make backup (MONGODB_URL or MONGO_*)
backup:
	@mkdir -p $(BACKUP_DIR)
	bash Scripts/backup-mongodb.sh $(BACKUP_DIR)

# Database restore — Usage: make restore FILE=./backups/apiadmin_....archive.gz
restore:
	@if [ -z "$(FILE)" ]; then echo "❌ Usage: make restore FILE=path/to/backup"; exit 1; fi
	bash Scripts/restore-mongodb.sh "$(FILE)"

# Logical config backup (JSON) — Usage: make config-backup OUT=./backups/config.json
config-backup:
	@mkdir -p $(BACKUP_DIR)
	node Scripts/config-backup.js --out $${OUT:-$(BACKUP_DIR)/apiadmin-config-backup.json}

# Logical config restore — Usage: make config-restore FILE=./backups/config.json
config-restore:
	@if [ -z "$(FILE)" ]; then echo "❌ Usage: make config-restore FILE=path/to/config.json"; exit 1; fi
	node Scripts/config-restore.js --file "$(FILE)"

# Terragrunt: init repository + actions units (terraform-github-modules)
tg-init:
	cd terragrunt/prod/github/apiadmin/repository && terragrunt init
	cd terragrunt/prod/github/apiadmin/actions && terragrunt init

# Terragrunt: tflint (canonical config: terragrunt/tflint.hcl — not .tflint.hcl,
# which Terragrunt auto-detects and injects broken --var flags)
tg-lint:
	@CFG="$(CURDIR)/terragrunt/tflint.hcl"; \
	tflint --init --config "$$CFG"; \
	for unit in repository actions; do \
	  echo "==> tflint $$unit"; \
	  tflint --config "$$CFG" --chdir="$(CURDIR)/terragrunt/prod/github/apiadmin/$$unit"; \
	done

# Terragrunt: plan both units (dependency order via actions → repository)
tg-plan:
	cd terragrunt/prod/github/apiadmin && terragrunt run --all -- plan -input=false

# Terragrunt: apply repository then actions (run --all respects dependencies)
tg-apply:
	cd terragrunt/prod/github/apiadmin && terragrunt run --all -- apply -input=false -auto-approve
