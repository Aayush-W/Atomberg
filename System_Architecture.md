# GoalForge - System Architecture Document

## 1. Executive Summary & The Noble Idea
**The Noble Idea**: GoalForge aims to democratize organizational growth by transitioning goal-tracking from a reactive HR mandate to a proactive, intelligent ecosystem. By automatically syncing cascading goals and evaluating manager sentiment via ML, it prevents employee burnout and perfectly aligns individual tasks with corporate strategy.

GoalForge is built using a modern microservice-oriented architecture, Containerized via Docker, and structured into three primary tiers: Presentation (Frontend), Application (Backend API + ML Service), and Data (PostgreSQL).

---

## 2. High-Level Architecture

The architecture is divided into the following core tiers:

### 2.1 Presentation Tier (Frontend)
- **Framework:** React.js powered by Vite for rapid build and hot-module replacement.
- **State Management:** Zustand (for lightweight, scalable global state, e.g., Authentication state).
- **Styling:** TailwindCSS for utility-first, responsive, and highly customizable UI design.
- **API Communication:** Axios with interceptors for automatic JWT token attachment and refresh flows.

### 2.2 Application Tier (Backend)
- **Runtime:** Node.js with Express framework, written strictly in TypeScript.
- **Authentication:** JWT (JSON Web Tokens) with short-lived access tokens and long-lived refresh tokens.
- **Business Logic Rules Engine:** Extracts complex timeline constraints (e.g., the 21-day quarterly check-in window) and goal weightage limits (up to 100%) into reusable services.
- **Background Jobs:** Uses `node-cron` to periodically scan for missing check-ins or pending approvals and trigger escalation events.

### 2.3 Machine Learning Tier (AI Service)
- **Framework:** Python FastAPI running on Uvicorn.
- **Functionality:** Exposes lightweight HTTP endpoints to the Node.js backend to perform Sentiment Analysis on manager comments and predict goal quality metrics.

### 2.4 Data Tier (Database)
- **Database Engine:** PostgreSQL 15.
- **ORM:** Prisma Client. Provides a fully type-safe query builder that automatically syncs the database schema with TypeScript types.

---

## 3. Core Component Workflows

### 3.1 Strict Check-in Windows & UoM Formulas
The system enforces rigorous business constraints at the controller level:
- **Timeline Validation:** When a `CheckIn` is created or updated, the system evaluates the current date against the active `Cycle` (e.g., Q1, Q2) to ensure the 21-day window is open. If closed, the API rejects the request unless a global `bypassWindow` flag is active.
- **Progress Computation (UoM):** Progress is dynamically computed on the backend based on the Unit of Measurement (MIN, MAX, TIMELINE, ZERO) rather than trusting client-side calculations.

### 3.2 Shared Goals Synchronization
To support hierarchical organization structures, goals can be cascaded:
- When a Manager updates the progress of a parent goal, the Backend Prisma transaction automatically queries all linked child goals (`parentGoalId`) and cascades the exact same `actualValue`, `progressScore`, and `completionDate` downwards.
- Role-Based Access Control (RBAC) prevents employees from directly modifying check-ins of inherited shared goals.

### 3.3 Security & Role-Based Access Control (RBAC)
- **Employee (L3):** Can draft goals, submit check-ins (for owned goals), and view their own dashboards.
- **Manager (L1/L2):** Can approve goals, add manager comments, create shared goals, and view team analytics.
- **HR/Admin:** Can configure Organizational Cycles, define Escalation Rules, and bypass timeline constraints.

---

## 4. Entity Relationship (Database Schema)

The Prisma PostgreSQL database consists of the following core entities:
- **User:** Stores employee credentials, roles, and departmental reporting hierarchy (`managerId`).
- **Cycle:** Defines the organizational financial year and strict quarterly window start/end dates.
- **Goal:** Stores the objective, target, UoM Type, weightage, and relates to a `Cycle` and `User`. Supports self-referential relations (`parentGoalId`) for shared goals.
- **CheckIn:** Tracks quarterly progress against a goal.
- **AuditLog:** Provides a tamper-proof history of critical actions (e.g., `CHECKIN_DELETED`, `GOAL_APPROVED`).
- **EscalationRule & Event:** Configures SLA triggers for missing check-ins or approvals.

---

## 5. External Integrations (Bonus Architecture)

The system is designed to easily plug into enterprise ecosystems:
1. **Microsoft Entra ID (Azure AD):** The `User` schema includes `microsoftEntraId` and `microsoftTenantId` fields to support seamless OIDC Single Sign-On.
2. **Microsoft Teams Webhooks:** The Escalation Engine is architected to push JSON payloads to MS Teams webhook URLs when SLA thresholds are breached.

---

## 6. Deployment Strategy
The entire stack is orchestrated using **Docker Compose**. 
- `goalforge-postgres`
- `goalforge-backend` (Depends on Postgres)
- `goalforge-ml-service`
- `goalforge-frontend` (Depends on Backend)

All services run in isolated containers, ensuring environment parity between local development, testing, and production deployments.
