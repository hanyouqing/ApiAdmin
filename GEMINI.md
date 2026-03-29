# GEMINI.md - Context & Guidelines for ApiAdmin

## Project Overview
**ApiAdmin** is a modern, self-hosted API management platform designed to replace legacy tools like YApi. It facilitates the entire API lifecycle: design, documentation, mocking, and automated testing. It features a split Client/Server architecture, containerized deployment, and a plugin system.

## Tech Stack

### Frontend (`/Client`)
-   **Framework:** React 18
-   **Build Tool:** Vite
-   **Language:** TypeScript
-   **UI Library:** Ant Design
-   **State Management:** Redux Toolkit
-   **Editor:** Monaco Editor
-   **Testing:** Vitest, React Testing Library
-   **Styling:** SCSS, Less (AntD theme)

### Backend (`/Server`)
-   **Runtime:** Node.js (>=18.0.0)
-   **Framework:** Koa
-   **Language:** JavaScript (Migration to TypeScript recommended/in-progress)
-   **Database:** MongoDB (Mongoose ODM)
-   **Caching:** Redis (ioredis)
-   **Authentication:** JWT, Passport.js (SSO: SAML, OAuth2, LDAP)
-   **Documentation:** Swagger/OpenAPI

### Infrastructure
-   **Containerization:** Docker, Docker Compose
-   **Orchestration:** Kubernetes (Helm Charts)
-   **CI/CD:** GitHub Actions, GitLab CI

## Architecture
-   **Monorepo:** Root contains `Client` and `Server` directories.
-   **Plugin System:** located in `Plugins/`, allowing extension of both client and server capabilities.
-   **Core Utils:** Shared logic in `Core/` (and local `Utils/` directories).

## Development Guidelines

### 1. Coding Standards
-   **TypeScript (Frontend):** Strict typing. Avoid `any`. Define interfaces for all props and API responses.
-   **JavaScript (Backend):** Use ES Modules (`import/export`). Prefer functional patterns.
-   **Naming:**
    -   Files: `PascalCase` for React components (e.g., `Button.tsx`), `camelCase` for utilities/logic (e.g., `formatDate.ts`).
    -   Variables: `camelCase`.
    -   Constants: `UPPER_SNAKE_CASE`.
-   **Formatting:** Prettier is enforced (`.prettierrc`). ESLint is used for linting.

### 2. State Management (Redux)
-   Use `Redux Toolkit` (Slices).
-   Async logic goes into `createAsyncThunk`.
-   Keep global state minimal; prefer local state or context for component-specific data.

### 3. Testing Strategy
-   **Unit Tests:** Vitest for logic and components.
-   **Integration Tests:** Verify API endpoints and database interactions.
-   **Mocking:** Use `vi.mock` (Vitest) for external dependencies.

### 4. Git Workflow
-   **Commit Messages:** Conventional Commits (e.g., `feat: add user login`, `fix: resolve null pointer`).
-   **Branching:** Feature branches from `main` or `develop`.

## Key Directories
-   `Client/`: Frontend source code.
-   `Server/`: Backend source code.
-   `Docs/`: Detailed architecture and requirements documentation.
-   `Plugins/`: Extension modules.
-   `Scripts/`: Maintenance and build scripts.

## Common Tasks
-   **Start Dev:** `npm run dev` (Runs both client and server concurrently).
-   **Build:** `npm run build`.
-   **Test:** `npm test`.
-   **Lint:** `npm run lint`.

## Critical Context
-   **Legacy Compatibility:** The project aims to import data from YApi, Swagger, and Postman.
-   **Security:** JWT secrets and DB credentials must be environment variables. **Never commit secrets.**
-   **Verification:** Always run `npm test` and `npm run lint` before finishing a task.
