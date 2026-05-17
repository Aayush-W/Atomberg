# GoalForge — Production Deployment Architecture

This document tracks the live production deployment architecture for the **GoalForge** enterprise platform, reflecting its fully distributed, zero-cost production cloud architecture.

---

## 1. High-Level System Architecture Diagram

The GoalForge platform consists of four fully containerized and edge-distributed segments:

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    HTTPS (Vercel Domain)
                                 │
                                 ▼
    ┌──────────────────────────────────────────────────┐
    │         VERCEL (Frontend Edge Hosting)            │
    │                                                  │
    │  ┌────────────────────────────────────────┐     │
    │  │  GoalForge React + Vite App            │     │
    │  │  - Dashboard, Goals, Analytics, etc.  │     │
    │  │                                        │     │
    │  │  Environment Secrets:                  │     │
    │  │  - VITE_API_URL                        │     │
    │  │  - VITE_ML_API_URL                     │     │
    │  └────────────────────────────────────────┘     │
    └────┬──────────────────────────┬─────────────────┘
         │                          │
         │ HTTPS                    │ HTTPS
         │                          │
         ▼                          ▼
    ┌─────────────────┐      ┌───────────────────────┐
    │ HUGGINGFACE     │      │ HUGGINGFACE SPACES    │
    │ (Backend API)   │      │ (ML Service)          │
    │                 │      │                       │
    │ Express/Node    │      │ FastAPI               │
    │ - Users         │      │ - Predictions         │
    │ - Goals         │      │ - Model Serving       │
    │ - Analytics     │      │ - Anomaly Detection   │
    │ - Reports       │      │                       │
    └────────┬────────┘      └───────────┬───────────┘
             │                           │
             │ POSTGRESQL PROTOCOL       │
             │ (Connection Pool)         │ May call for
             │                           │ advanced features
             │                           │
             ▼                           │
         ┌─────────────────┐             │
         │ NEON            │◄────────────┘
         │ (PostgreSQL     │
         │  Database)      │
         │                 │
         │ - User data     │
         │ - Goals         │
         │ - Performance   │
         │   metrics       │
         │ - Audit logs    │
         └─────────────────┘
```

---

## 2. Cloud Infrastructure Deployments

### 2.1 Frontend
* **Platform:** Vercel (Edge Network)
* **Live URL:** `https://goalforge-atomberg.vercel.app`
* **Auto-Scaling:** Automatic and infinitely scalable via Vercel's global Serverless Edge CDN.
* **Environment Variables:**
  * `VITE_API_URL`: `https://aayush-w-goalforge-backend.hf.space/api`
  * `VITE_ML_API_URL`: `https://aayush-w-goalforge-ml.hf.space/api`

### 2.2 Core API Backend
* **Platform:** Hugging Face Spaces (Docker Space)
* **Live API URL:** `https://aayush-w-goalforge-backend.hf.space`
* **Containerization:** Deployed via custom Alpine Linux Dockerfile listening on port `7860`.
* **Database Driver:** Prisma Client with Pooled connections (`sslmode=require`).
* **Critical Secrets:**
  * `PORT`: `7860`
  * `DATABASE_URL`: *[Neon Connection String]*
  * `JWT_SECRET`: *[Access Token signing secret]*
  * `JWT_REFRESH_SECRET`: *[Refresh Token signing secret]*
  * `ML_SERVICE_URL`: `https://aayush-w-goalforge-ml.hf.space`
  * `CORS_ORIGIN`: `https://goalforge-atomberg.vercel.app`

### 2.3 Machine Learning Service
* **Platform:** Hugging Face Spaces (Docker Space)
* **Live ML URL:** `https://aayush-w-goalforge-ml.hf.space`
* **Port:** `7860` (Hugging Face default entrypoint).
* **Stack:** FastAPI, Python 3.10, PyTorch, Hugging Face Transformers.

### 2.4 Serverless Database
* **Platform:** Neon (PostgreSQL 15)
* **Compute Management:** Serverless autoscaling (scales directly down to 0 compute units during periods of organizational inactivity to prevent cost accumulation).
* **Backup Strategy:** Neon automated active point-in-time recovery.

---

## 3. Data Integration Workflows

### 3.1 Authenticated Session Lifecycle
1. User supplies corporate credentials at the React Front-End.
2. Front-End initiates a secure `POST /api/auth/login` containing email and password.
3. Backend matches credentials using hashed password verification (`bcrypt.compare`).
4. On success, Backend returns a short-lived JSON Web Token (`VITE_API_URL` Access Token) and drops a 7-day security cookie (`JWT_REFRESH_SECRET` Refresh Token) with `HttpOnly`, `Secure`, and `SameSite=Lax` properties.
5. In subsequent sessions, frontend Axios interceptors catch expiring tokens and silently refresh them against `/api/auth/refresh` using cookie parameters.

### 3.2 Dynamic Score Calculation Engine
To prevent rounding errors, the mathematical progression calculation is fully synchronized across the client (Vite React) and the server (Node Prisma).
* **Formula Reconciliation:** The platform computes progression scores dynamically based on the specific Unit of Measurement (`MIN`, `MAX`, `TIMELINE`, `ZERO`) to ensure absolute data alignment between the manager and employee dashboards.

### 3.3 Cascading Goal Synchronization
* When a Manager registers a check-in progress update against a parent goal, a cascading database transaction queries all children sheets where `parentGoalId` is referenced. 
* All records are locked via database transactions, updating the `actualValue`, progress metrics, and completion timelines downward in a secure waterfall.

---

## 4. Operational Cost Matrix

| Segment | Production Cloud Tier | Base Cost |
|---|---|---|
| **Frontend** | Vercel Hobby Tier | $0.00 / month |
| **Backend API** | Hugging Face Free CPU Space | $0.00 / month |
| **ML Engine** | Hugging Face Free CPU Space | $0.00 / month |
| **Database** | Neon Serverless Free Tier | $0.00 / month |
| **Total Costs** | **Distributed Cloud Stack** | **$0.00 / month** |
