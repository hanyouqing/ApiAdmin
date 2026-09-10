.PHONY: help build run test test-coverage test-verbose test-package e2e swagger migrate migrate-status migrate-down clean frontend backend start backup restore config-backup config-restore deps install fmt lint check docker docker-up docker-down audit

.DEFAULT_GOAL := help

BACKUP_DIR ?= ./backups
COMPOSE ?= docker-compose

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

# Run frontend dev server (Vite)
frontend:
	cd Client && npm run dev

# Run backend dev server
backend:
	cd Server && npm run dev

# Run both frontend and backend in development
start:
	npm run dev

# Run unit tests (uses in-memory MongoDB via vitest setup)
test:
	npm test -- --run

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

# Run a single vitest file — Usage: make test-package FILE=tests/unit/Security.test.js
test-package:
	@if [ -z "$(FILE)" ]; then echo "❌ Usage: make test-package FILE=tests/unit/Security.test.js"; exit 1; fi
	npx vitest run $(FILE)

# Enable / generate Swagger notes (served when SWAGGER_ENABLED=true)
swagger:
	@echo "Swagger is generated at runtime by Server/Utils/swagger.js"
	@echo "Set SWAGGER_ENABLED=true and restart the server, then open:"
	@echo "  http://localhost:$${PORT:-3000}/swagger"
	@echo "Allowed IPs: $${SWAGGER_ALLOWED_IP_ADDRESSES:-127.0.0.1}"

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
check: fmt lint test

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
