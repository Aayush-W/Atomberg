# GoalForge Implementation Plan

Based on the provided `prompt.md` and `action_plan.md`, here is the analysis of the project's current progress and the roadmap to complete it.

## 1. Project Analysis & Current Progress

I have reviewed the project directory (`c:/Users/Aayush Walsangikar/OneDrive/Desktop/Atomberg/goalforge/`) and compared it against the 16-step action plan.

### What is Completed:
- **Step 1 (Foundation):** Docker compose file is present. Backend and ML Service basic skeleton files (`package.json`, `requirements.txt`, `.env`) are created.
- **Step 2 (Database):** The complete Prisma schema (`schema.prisma`) and seed file (`seed.ts`) are implemented.
- **Step 3 (Backend Auth & Middleware):** Auth, Roles, and error handling middleware have been implemented.
- **Step 4 (Backend Core API) - Partial:** Controllers and routes for Users, Cycles, Goals, Check-ins, and Reports are implemented.

### What is Missing / Needs Fixing:
- **Step 1 Fix:** The frontend React/Vite foundation is incomplete. Missing files: `index.html`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `App.tsx`, `main.tsx`, and `index.css`.
- **Step 4 (Backend Core API) - Remaining:** Audit and Notifications controllers and routes are missing.
- **Step 5 (AI Integration):** `ai.service.ts` and the Anthropic API endpoints.
- **Step 6 (ML Service):** The Python data generation, model training scripts, and FastAPI endpoints.
- **Step 7 (Escalation Engine):** Node-cron jobs for GOAL_NOT_SUBMITTED, APPROVAL_PENDING, CHECKIN_MISSING, and Nodemailer integration.
- **Step 8 (Frontend Foundation):** React Router setup, persistent sidebar, Zustand stores, Axios interceptors, and reusable UI components.
- **Step 9 - 14 (Frontend Pages):** Auth, Employee, Manager, Admin pages, and the React Flow Dependency Graph.
- **Step 15 - 16 (Polish & Docs):** Export functionality, responsiveness, error states, and `README.md`/`architecture.md`.

## User Review Required

> [!IMPORTANT]
> Since we need to use Anthropic API for the AI features (Step 5), do you have an `ANTHROPIC_API_KEY` available in the backend's `.env` file? If not, we will need to set that up or mock the responses for testing purposes.
> 
> Also, for Step 6, the ML Service uses Python packages like `sentence-transformers` and `xgboost`. When we train the models, it might take a few minutes and require downloading pre-trained models.

## Proposed Changes (Roadmap)

### Phase 1: Fix Frontend Foundation & Finish Backend API
- **[NEW]** Create Vite and Tailwind config files (`vite.config.ts`, `tailwind.config.js`, etc.) in `frontend/`.
- **[NEW]** Create `main.tsx`, `App.tsx`, and `index.css` in `frontend/src/`.
- **[NEW]** Create `audit.controller.ts` and `audit.routes.ts` in `backend/src/`.
- **[NEW]** Create `notifications.controller.ts` and `notifications.routes.ts` in `backend/src/`.
- **[MODIFY]** Update `backend/src/routes/index.ts` to include the new routes.

### Phase 2: AI Integration (Backend)
- **[NEW]** Create `backend/src/services/ai.service.ts` to interact with Anthropic's API.
- **[NEW]** Implement the 5 AI endpoints (`smart-rewrite`, `conflict-check`, `suggest-weightage`, `conversational-checkin`, `goal-summary`).

### Phase 3: ML Service (Python)
- **[NEW]** Write `generate_synthetic_data.py` to create 500 employee records.
- **[NEW]** Write training scripts (`achievement_predictor.py`, `goal_quality_classifier.py`, etc.).
- **[NEW]** Create the FastAPI app (`main.py`) with inference endpoints.

### Phase 4: Escalation Engine
- **[NEW]** Write `backend/src/jobs/escalation.job.ts` for cron-based rules checking.
- **[NEW]** Create `escalations.controller.ts` and `escalations.routes.ts`.

### Phase 5: Frontend Development (Steps 8-14)
- **[NEW]** Build common UI components (Button, Modal, Input, Table, etc.).
- **[NEW]** Implement Zustand stores and API services with Axios.
- **[NEW]** Build the routing structure and develop all Pages (Auth, Employee Dashboard, Manager View, Admin Settings).
- **[NEW]** Integrate `reactflow` for the Goal Dependency Graph.

### Phase 6: Polish & Documentation
- **[NEW]** Add CSV/Excel export features.
- **[NEW]** Write `README.md` and `architecture.md`.

## Verification Plan
### Automated & API Tests
- Use Docker Compose to spin up the Database, Backend, Frontend, and ML Service.
- Ensure `npx prisma db push` and `npx ts-node prisma/seed.ts` run without errors.
- Test backend endpoints and ensure valid JSON responses.

### Manual Verification
- Test login flow using seeded credentials (e.g., `admin@goalforge.com`).
- Verify goal creation, progress check-ins, and approval flows.
- Confirm that the Goal Dependency Graph displays correctly.
- Ensure the UI looks premium with glassmorphism and proper responsive behaviors.
