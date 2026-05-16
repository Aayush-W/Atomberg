# GoalForge

GoalForge is a role-based goal management system built with a Node/Express backend, a React/Vite frontend, a Python ML service, and PostgreSQL persistence. It supports employee goal creation and tracking, manager approvals, admin configuration, analytics, audit logging, notifications, AI helpers, and ML-powered insights.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Startup Options](#startup-options)
  - [Option 1: Docker Compose](#option-1-docker-compose)
  - [Option 2: Local Development](#option-2-local-development)
- [Known Seeded Users](#known-seeded-users)
- [How to Test](#how-to-test)
- [Role-Based Walkthrough](#role-based-walkthrough)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

## Project Overview

GoalForge provides a complete goals lifecycle management experience with separate experiences for:

- **Employees**: create goals, update them, submit for approval, make check-ins, and view history.
- **Managers**: approve or reject goals, review team goals, create shared goals, and view dashboards.
- **Admins**: manage users, cycles, goals, escalations, reports, audits, and ML insights.

The system includes:

- JWT authentication with refresh support
- Role-based route authorization
- Goal dependency graphs
- Manager and admin analytics reports
- Notifications and read state
- Audit logs for goal changes
- AI helper endpoints for goal writing and check-in assistance
- ML service for achievement prediction and sentiment/trend analysis

## Architecture

The repository is organized as follows:

- `server/`: Express API server with Prisma and PostgreSQL
- `client/`: React application built with Vite and TypeScript
- `ml-service/`: FastAPI Python service for machine learning support
- `docker-compose.yml`: orchestrates Postgres, backend, frontend, and ml-service
- `.env`: root environment configuration for all services

## Features

### Employee features
- Create goals
- Submit goals for manager approval
- Update goals before submission
- Perform check-ins and track progress
- View personal goal history

### Manager features
- Review pending goals
- Approve or reject goals
- View team goals and shared goals
- Access analytics and dependency graph views

### Admin features
- Create and manage users
- Create and manage goal cycles
- Access and manage all goals
- Configure and view escalation rules
- View reports and audit logs
- Inspect ML-based insights

### Cross-cutting features
- Notifications for goal and check-in activity
- Audit trails and goal-specific audit access
- AI helpers for rewriting, conflict checks, weightage suggestions, conversational check-in creation, and goal summarization
- ML endpoints for predictions, anomalies, thrust area suggestions, and sentiment trends

## Repository Structure

```text
Atomberg/
  README.md
  docker-compose.yml
  .env
  goalforge/
    backend/
      Dockerfile
      package.json
      tsconfig.json
      prisma/
        schema.prisma
        seed.ts
      src/
        index.ts
        controllers/
        routes/
        middleware/
        services/
        utils/
        validators/
    frontend/
      Dockerfile
      package.json
      tsconfig.json
      vite.config.ts
      src/
        App.tsx
        main.tsx
        components/
        pages/
        services/
        stores/
    ml-service/
      Dockerfile
      requirements.txt
      main.py
      train.py
      data/
      models/
```

## Environment Variables


### `server/.env`

```env
PORT=4000
DATABASE_URL=postgresql://goalforge:goalforgepass@postgres:5432/goalforge
JWT_SECRET=supersecretkey
JWT_REFRESH_SECRET=refreshsecretkey
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=ethereal_user
EMAIL_PASS=ethereal_pass
```

### `client/.env`

```env
VITE_API_URL=http://localhost:4000
VITE_ML_API_URL=http://localhost:8000
VITE_APP_NAME=GoalForge
```

### `ml-service/.env`

```env
PORT=8000
MODEL_DIR=./models
```

> Note: If you run the services outside Docker, ensure each service is using the correct `.env` file and ports do not conflict.

## Startup Options

### Option 1: Docker Compose

From the repository root:

```powershell
docker-compose up --build
```

This launches:
- PostgreSQL database
- backend API server on `http://localhost:4000`
- frontend development server on `http://localhost:5173`
- ML service on `http://localhost:8000`

### Option 2: Local Development

#### Backend

```powershell
cd server
npm install
npm run dev
```

The backend uses `src/index.ts` and serves the API on `http://localhost:4000` by default.

#### Frontend

```powershell
cd client
npm install
npm run dev
```

The frontend is a Vite app and will run on `http://localhost:5173` by default.

#### ML Service

```powershell
cd ml-service
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Known Seeded Users

The backend seed file includes the following accounts:

- Admin: `admin@goalforge.com` / `Admin@123`
- Manager: `manager1@goalforge.com` / `Manager@123`
- Employee: `employee@goalforge.com` / `Employee@123`

These accounts are created by `server/prisma/seed.ts`.

## How to Test

### 1. Verify backend health

Open the browser or use a REST client:

- `GET http://localhost:4000/api/health`
- `GET http://localhost:4000/api/version`

### 2. Login via frontend

Open `http://localhost:5173` in your browser and use one of the seeded credentials.

### 3. Role-based verification

#### Employee flow
- `/employee/dashboard`
- `/employee/goals`
- `/employee/goals/new`
- `/employee/checkin`
- `/employee/history`

#### Manager flow
- `/manager/dashboard`
- `/manager/approvals`
- `/manager/team`
- `/manager/shared-goals`
- `/manager/analytics`
- `/manager/dependency-graph`

#### Admin flow
- `/admin/dashboard`
- `/admin/cycles`
- `/admin/users`
- `/admin/goals`
- `/admin/escalations`
- `/admin/reports`
- `/admin/audit`
- `/admin/ml-insights`
- `/admin/dependency-graph`

### 4. API-level testing

Use Postman, curl, or similar to call endpoints directly.

Example:

```powershell
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"employee@goalforge.com\",\"password\":\"Employee@123\"}"
```

Then use the returned access token for authenticated requests.

### 5. Confirm token refresh behavior

The frontend automatically handles 401 responses and refreshes the access token using `/api/auth/refresh`.

## Role-Based Walkthrough

### Employee
1. Login as `employee@goalforge.com`
2. Create a new goal in `/employee/goals/new`
3. Submit the goal for approval
4. Add progress check-ins in `/employee/checkin`
5. Inspect goal history in `/employee/history`

### Manager
1. Login as `manager1@goalforge.com`
2. Review pending goals in `/manager/approvals`
3. Approve or reject employee goals
4. View team goals in `/manager/team`
5. Create shared goals and inspect shared goal relationships
6. View analytics and goal dependency graph

### Admin
1. Login as `admin@goalforge.com`
2. Manage users in `/admin/users`
3. Create or update goal cycles in `/admin/cycles`
4. Review all goals in `/admin/goals`
5. Configure escalation rules in `/admin/escalations`
6. Inspect report outputs in `/admin/reports`
7. View audit histories in `/admin/audit`
8. Explore ML insights in `/admin/ml-insights`

## API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users
- `GET /api/users` (admin)
- `POST /api/users` (admin)
- `GET /api/users/team/:managerId`
- `GET /api/users/:id`
- `PUT /api/users/:id`

### Goals
- `GET /api/goals`
- `GET /api/goals/team` (manager/admin)
- `GET /api/goals/all` (admin)
- `POST /api/goals` (employee)
- `POST /api/goals/shared` (manager/admin)
- `GET /api/goals/dependency-graph`
- `GET /api/goals/:id/audit`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`
- `POST /api/goals/:id/submit`
- `POST /api/goals/:id/approve` (manager/admin)
- `POST /api/goals/:id/reject` (manager/admin)
- `POST /api/goals/:id/unlock` (admin)
- `POST /api/goals/:id/dependency`

### Check-ins
- `POST /api/checkins`
- `GET /api/checkins/goal/:goalId`
- `GET /api/checkins/:id`
- `PUT /api/checkins/:id`
- `DELETE /api/checkins/:id`

### Cycles
- `GET /api/cycles`
- `GET /api/cycles/active`
- `POST /api/cycles` (admin)
- `PUT /api/cycles/:id` (admin)
- `GET /api/cycles/:id/status`

### Reports
- `GET /api/reports/achievement`
- `GET /api/reports/completion`
- `GET /api/reports/manager-effectiveness`
- `GET /api/reports/qoq-trends`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`

### Audit
- `GET /api/audit` (admin)
- `GET /api/audit/goal/:goalId` (admin/manager)

### Escalations
- `GET /api/escalations/rules` (admin)
- `POST /api/escalations/rules` (admin)
- `PUT /api/escalations/rules/:id` (admin)
- `GET /api/escalations/log` (admin)
- `POST /api/escalations/trigger-manual` (admin)

### AI Helper Endpoints
- `POST /api/ai/smart-rewrite`
- `POST /api/ai/conflict-check`
- `POST /api/ai/suggest-weightage`
- `POST /api/ai/conversational-checkin`
- `POST /api/ai/goal-summary`

### ML Service Endpoints
- `POST /api/ml/predict-achievement`
- `POST /api/ml/goal-quality`
- `GET /api/ml/anomalies`
- `POST /api/ml/suggest-thrust-area`
- `GET /api/ml/sentiment-trends`

## Troubleshooting

### `git push` says remote ref is locked
This is usually transient. Ensure your local branch is up to date and retry:

```powershell
git fetch origin
git pull --rebase origin main
git push origin main
```

### Frontend cannot reach backend
- Confirm `VITE_API_URL` is set correctly in `client/.env`
- Confirm backend is running on the expected port
- Confirm CORS is enabled in `server/src/index.ts`

### Backend cannot connect to Postgres
- Confirm `DATABASE_URL` is correct
- Confirm PostgreSQL is running and reachable
- Confirm Docker Compose service names match `postgres`

### ML service errors
- Confirm `ml-service/.env` is present
- Confirm `uvicorn` can start on port `8000`

## Notes

- The frontend uses `src/App.tsx` to guard routes by role.
- The backend automatically runs escalation jobs on startup.
- The seed data includes example admin, manager, and employee accounts.
- `baseUrl` is currently configured in `client/tsconfig.json` with `ignoreDeprecations: "6.0"` to avoid TypeScript 7.0 warnings.

---

Enjoy using GoalForge! If you want, I can also add a shorter quick-start script or a development checklist to this README.# GoalForge

GoalForge is a role-based goal management application with support for employees, managers, and admins. It combines goal planning, check-ins, approvals, reporting, escalation rules, audit history, AI-powered helpers, and ML insights.

## Architecture

The project is organized into three main subprojects:

- `server` — Express + TypeScript backend API
- `client` — React + Vite frontend application
- `ml-service` — Python FastAPI ML service

There is also a root `docker-compose.yml` file to run all services together with PostgreSQL.

## Core features

### Employee
- Create and manage personal goals
- Submit goals for approval
- Add check-ins and progress updates
- View history and performance tracking

### Manager
- Review and approve/reject employee goals
- View team goals and shared goals
- See analytics and dependency graphs
- Manage team progress and approvals

### Admin
- Manage users and role assignments
- Manage goal cycles
- Manage goals globally
- Configure escalation rules and review escalation logs
- View reports and audit trails
- Access ML insights

### Shared system capabilities
- JWT authentication with refresh tokens
- Role-based route protection
- Notifications and read status handling
- Audit logs and goal history
- AI helper endpoints for goal text and checkin assistance
- ML endpoints for prediction, anomalies, and sentiment trends

## Repository structure

```text
goalforge/
  backend/
    Dockerfile
    package.json
    prisma/
      schema.prisma
      seed.ts
    src/
      controllers/
      jobs/
      lib/
      middleware/
      routes/
      services/
      types/
      utils/
      validators/
  frontend/
    Dockerfile
    package.json
    src/
      App.tsx
      components/
      pages/
      services/
      stores/
      types/
      utils/
  ml-service/
    Dockerfile
    main.py
    requirements.txt
    train.py
    data/
    models/
```

## Environment variables

### Root `.env`

The root `.env` file is used by `docker-compose.yml` to configure all services.

Example values from this project:

```env
POSTGRES_USER=goalforge
POSTGRES_PASSWORD=goalforgepass
POSTGRES_DB=goalforge
POSTGRES_HOST=postgres
BACKEND_PORT=4000
FRONTEND_PORT=5173
ML_SERVICE_PORT=8000
JWT_SECRET=supersecretkey
JWT_REFRESH_SECRET=refreshsecretkey
DATABASE_URL=postgresql://goalforge:goalforgepass@postgres:5432/goalforge
VITE_API_URL=http://localhost:4000
```

### Backend `server/.env`

```env
PORT=4000
DATABASE_URL=postgresql://goalforge:goalforgepass@postgres:5432/goalforge
JWT_SECRET=supersecretkey
JWT_REFRESH_SECRET=refreshsecretkey
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=ethereal_user
EMAIL_PASS=ethereal_pass
```

### Frontend `client/.env`

```env
VITE_API_URL=http://localhost:4000
VITE_ML_API_URL=http://localhost:8000
VITE_APP_NAME=GoalForge
```

### ML service `ml-service/.env`

```env
PORT=8000
MODEL_DIR=./models
```

> Note: In production, replace secrets with secure values and do not commit them.

## Quick start

### Option 1: Run with Docker Compose

From the repository root:

```bash
docker-compose up --build
```

This will start:
- `postgres` database
- `backend` API
- `frontend` web UI
- `ml-service` ML backend

Then open the frontend in your browser at:

```text
http://localhost:5173
```

### Option 2: Run locally service-by-service

#### Backend

```bash
cd server
npm install
npm run dev
```

The backend listens on `http://localhost:4000` by default.

#### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend listens on `http://localhost:5173`.

#### ML service

```bash
cd ml-service
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The ML service listens on `http://localhost:8000`.

## Seeded test users

The backend seed data includes the following users in `server/prisma/seed.ts`:

- Admin: `admin@goalforge.com` / `Admin@123`
- Manager: `manager1@goalforge.com` / `Manager@123`
- Employee: `employee@goalforge.com` / `Employee@123`

Use these credentials to test role-based functionality.

## Key user flows

### Employee flow
1. Login as employee
2. Visit `/employee/dashboard`
3. Create a new goal under `/employee/goals/new`
4. Submit a goal for approval
5. Add check-ins on `/employee/checkin`
6. Review history on `/employee/history`

### Manager flow
1. Login as manager
2. Visit `/manager/dashboard`
3. Review new goals in `/manager/approvals`
4. Approve or reject goals
5. View team performance in `/manager/team`
6. Use `/manager/analytics` for reports
7. Inspect dependencies in `/manager/dependency-graph`

### Admin flow
1. Login as admin
2. Visit `/admin/dashboard`
3. Manage users in `/admin/users`
4. Create and update cycles in `/admin/cycles`
5. Review and manage goals in `/admin/goals`
6. Configure escalations in `/admin/escalations`
7. Inspect reports in `/admin/reports`
8. Review audit log in `/admin/audit`
9. View ML insights in `/admin/ml-insights`

## Frontend route summary

- `/login`
- `/employee/dashboard`
- `/employee/goals`
- `/employee/goals/new`
- `/employee/checkin`
- `/employee/history`
- `/manager/dashboard`
- `/manager/approvals`
- `/manager/team`
- `/manager/shared-goals`
- `/manager/analytics`
- `/manager/dependency-graph`
- `/admin/dashboard`
- `/admin/cycles`
- `/admin/users`
- `/admin/goals`
- `/admin/escalations`
- `/admin/reports`
- `/admin/audit`
- `/admin/ml-insights`

## Important backend endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Goals
- `GET /api/goals`
- `GET /api/goals/team`
- `GET /api/goals/all`
- `POST /api/goals`
- `POST /api/goals/shared`
- `GET /api/goals/dependency-graph`
- `GET /api/goals/:id/audit`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`
- `POST /api/goals/:id/submit`
- `POST /api/goals/:id/approve`
- `POST /api/goals/:id/reject`
- `POST /api/goals/:id/unlock`
- `POST /api/goals/:id/dependency`

### Check-ins
- `POST /api/checkins`
- `GET /api/checkins/goal/:goalId`
- `GET /api/checkins/:id`
- `PUT /api/checkins/:id`
- `DELETE /api/checkins/:id`

### Cycles
- `GET /api/cycles`
- `GET /api/cycles/active`
- `POST /api/cycles`
- `PUT /api/cycles/:id`
- `GET /api/cycles/:id/status`

### Users
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/team/:managerId`
- `GET /api/users/:id`
- `PUT /api/users/:id`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`

### Reports
- `GET /api/reports/achievement`
- `GET /api/reports/completion`
- `GET /api/reports/manager-effectiveness`
- `GET /api/reports/qoq-trends`

### Audit
- `GET /api/audit`
- `GET /api/audit/goal/:goalId`

### Escalations
- `GET /api/escalations/rules`
- `POST /api/escalations/rules`
- `PUT /api/escalations/rules/:id`
- `GET /api/escalations/log`
- `POST /api/escalations/trigger-manual`

### AI helpers
- `POST /api/ai/smart-rewrite`
- `POST /api/ai/conflict-check`
- `POST /api/ai/suggest-weightage`
- `POST /api/ai/conversational-checkin`
- `POST /api/ai/goal-summary`

### ML insights
- `POST /api/ml/predict-achievement`
- `POST /api/ml/goal-quality`
- `GET /api/ml/anomalies`
- `POST /api/ml/suggest-thrust-area`
- `GET /api/ml/sentiment-trends`

## Testing and validation

### Verify services
- Backend: `http://localhost:4000/api/health`
- Frontend: `http://localhost:5173`
- ML service: `http://localhost:8000/docs` (if FastAPI docs are enabled)

### Quick manual tests
- Login and verify role-based redirects
- Create a new goal and submit it
- Approve/reject as manager
- Add check-ins and view history
- View reports, audit logs, escalation UI, and ML insights

### Direct API tests
Use tools like `curl`, Postman, or HTTPie to test endpoints and verify authentication.

## Useful commands

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### ML service
```bash
cd ml-service
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker compose
```bash
docker-compose up --build
```

## Notes

- The frontend uses `VITE_API_URL` and `VITE_ML_API_URL` to call backend services.
- The backend stores session state with JWT access tokens and refresh tokens.
- Role-based protection is enforced in the frontend and backend.
- If you change environment variables, restart the relevant service.

---

If you want, I can also add a shorter `CONTRIBUTING.md` or a developer quick-start guide for this repo.
