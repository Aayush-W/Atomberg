You are an expert full-stack engineer. Build a complete, production-ready, fully functional 
web application called "GoalForge" — an intelligent Goal Setting & Tracking Portal for 
organizations. This is for a hackathon so every feature must work end-to-end without errors.

Do not scaffold or leave placeholders. Every feature described below must be fully implemented.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:
- React 18 + TypeScript
- Tailwind CSS for styling
- Recharts for all charts and visualizations
- React Flow (reactflow) for the Goal Dependency Graph
- React Router v6 for routing
- Axios for API calls
- React Query (TanStack Query) for server state
- Zustand for client state management
- React Hook Form + Zod for form validation
- React Hot Toast for notifications
- Lucide React for icons
- date-fns for date handling

Backend:
- Node.js + Express + TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication (access token + refresh token)
- bcrypt for password hashing
- node-cron for scheduled jobs (escalation engine)
- Nodemailer for email notifications
- Papa Parse / exceljs for CSV/Excel export
- OpenAI-compatible API calls to Anthropic (claude-sonnet-4-20250514) for AI features
- Python FastAPI microservice (separate service) for ML models
- scikit-learn, xgboost, transformers, sentence-transformers for ML

Database: PostgreSQL (latest)
ML Service: Python 3.11 + FastAPI + scikit-learn + xgboost + sentence-transformers
Deployment-ready: Docker + docker-compose for the whole stack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

goalforge/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   ├── goals/           # Goal-related components
│   │   │   ├── checkins/        # Check-in components
│   │   │   ├── reports/         # Reporting components
│   │   │   ├── ai/              # AI Coach components
│   │   │   ├── graph/           # Dependency graph
│   │   │   └── analytics/       # ML analytics components
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── employee/
│   │   │   ├── manager/
│   │   │   └── admin/
│   │   ├── stores/              # Zustand stores
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API service layer
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Helpers
├── backend/                     # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── jobs/                # Cron jobs
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
├── ml-service/                  # Python FastAPI ML microservice
│   ├── main.py
│   ├── models/
│   │   ├── achievement_predictor.py
│   │   ├── goal_quality_classifier.py
│   │   ├── anomaly_detector.py
│   │   └── thrust_area_tagger.py
│   ├── data/
│   │   └── generate_synthetic_data.py
│   └── train.py
└── docker-compose.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE SCHEMA (Prisma)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement ALL of the following models in schema.prisma:

model User {
  id              String    @id @default(uuid())
  name            String
  email           String    @unique
  password        String
  role            Role      // EMPLOYEE | MANAGER | ADMIN
  department      String
  managerId       String?
  manager         User?     @relation("Reports", fields: [managerId], references: [id])
  reportees       User[]    @relation("Reports")
  goals           Goal[]
  checkIns        CheckIn[]
  auditLogs       AuditLog[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Cycle {
  id              String    @id @default(uuid())
  name            String    // e.g. "FY 2025-26"
  startDate       DateTime
  endDate         DateTime
  isActive        Boolean   @default(true)
  goalSettingOpen DateTime  // May 1
  q1Open          DateTime  // July
  q2Open          DateTime  // October
  q3Open          DateTime  // January
  q4Open          DateTime  // March/April
  goals           Goal[]
  createdAt       DateTime  @default(now())
}

model Goal {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  cycleId         String
  cycle           Cycle       @relation(fields: [cycleId], references: [id])
  thrustArea      String
  title           String
  description     String
  uomType         UoMType     // MIN | MAX | TIMELINE | ZERO
  target          Float
  targetDate      DateTime?   // for TIMELINE type
  weightage       Float
  status          GoalStatus  @default(DRAFT)
  isShared        Boolean     @default(false)
  parentGoalId    String?     // for shared goals
  parentGoal      Goal?       @relation("SharedGoals", fields: [parentGoalId], references: [id])
  sharedWith      Goal[]      @relation("SharedGoals")
  qualityScore    Float?      // AI-computed SMART score
  qualityFeedback Json?       // AI feedback on each SMART dimension
  checkIns        CheckIn[]
  auditLogs       AuditLog[]
  dependencies    GoalDependency[] @relation("DependentGoal")
  dependents      GoalDependency[] @relation("RequiredGoal")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  managerComment  String?
  lockedAt        DateTime?
}

model GoalDependency {
  id              String  @id @default(uuid())
  dependentGoalId String
  requiredGoalId  String
  dependentGoal   Goal    @relation("DependentGoal", fields: [dependentGoalId], references: [id])
  requiredGoal    Goal    @relation("RequiredGoal", fields: [requiredGoalId], references: [id])
}

model CheckIn {
  id              String      @id @default(uuid())
  goalId          String
  goal            Goal        @relation(fields: [goalId], references: [id])
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  quarter         Quarter     // Q1 | Q2 | Q3 | Q4
  actualValue     Float
  completionDate  DateTime?   // for TIMELINE type
  status          CheckInStatus // NOT_STARTED | ON_TRACK | COMPLETED
  progressScore   Float       // system-computed
  managerComment  String?
  managerCheckedAt DateTime?
  sentiment       Float?      // NLP sentiment of manager comment (-1 to 1)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model AuditLog {
  id          String    @id @default(uuid())
  goalId      String?
  goal        Goal?     @relation(fields: [goalId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  action      String
  field       String?
  oldValue    String?
  newValue    String?
  timestamp   DateTime  @default(now())
}

model EscalationRule {
  id              String    @id @default(uuid())
  name            String
  triggerType     String    // GOAL_NOT_SUBMITTED | APPROVAL_PENDING | CHECKIN_MISSING
  daysThreshold   Int
  isActive        Boolean   @default(true)
  escalationChain Json      // [{level: 1, notifyRole: 'MANAGER'}, ...]
}

model Notification {
  id          String    @id @default(uuid())
  userId      String
  type        String
  title       String
  message     String
  isRead      Boolean   @default(false)
  createdAt   DateTime  @default(now())
}

Enums: Role (EMPLOYEE, MANAGER, ADMIN), UoMType (MIN, MAX, TIMELINE, ZERO),
GoalStatus (DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED), 
Quarter (Q1, Q2, Q3, Q4), CheckInStatus (NOT_STARTED, ON_TRACK, COMPLETED)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEEDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seed the database with:
- 1 Admin user: admin@goalforge.com / Admin@123
- 3 Manager users: manager1@goalforge.com, manager2@goalforge.com, manager3@goalforge.com / Manager@123
- 9 Employee users spread across managers / Employee@123
- 1 active Cycle: FY 2025-26 with all window dates
- 3 Thrust Areas: Innovation, Revenue Growth, Operational Excellence
- Sample goals in various states (DRAFT, SUBMITTED, APPROVED, LOCKED) for realistic demo
- Sample check-in data across Q1 and Q2 for historical ML training context
- 3 escalation rules pre-configured

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND API — ALL ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTH
POST   /api/auth/login              → { accessToken, refreshToken, user }
POST   /api/auth/refresh            → { accessToken }
POST   /api/auth/logout
GET    /api/auth/me

USERS
GET    /api/users                   → all users (Admin)
GET    /api/users/:id
GET    /api/users/team/:managerId   → manager's reportees
PUT    /api/users/:id               → update profile
POST   /api/users                   → create user (Admin)

CYCLES
GET    /api/cycles                  → all cycles
GET    /api/cycles/active           → current active cycle
POST   /api/cycles                  → create cycle (Admin)
PUT    /api/cycles/:id              → update cycle (Admin)
GET    /api/cycles/:id/status       → which windows are currently open

GOALS
GET    /api/goals                   → employee's own goals for active cycle
GET    /api/goals/team              → manager's team goals
GET    /api/goals/all               → all goals (Admin)
POST   /api/goals                   → create goal (Employee)
PUT    /api/goals/:id               → update goal (Employee, pre-submission only)
DELETE /api/goals/:id               → delete goal (Employee, DRAFT only)
POST   /api/goals/:id/submit        → submit for approval
POST   /api/goals/:id/approve       → approve (Manager) — locks goal
POST   /api/goals/:id/reject        → reject with comment (Manager)
POST   /api/goals/:id/unlock        → Admin unlock after lock
POST   /api/goals/shared            → push shared goal to multiple employees (Admin/Manager)
GET    /api/goals/:id/audit         → audit trail for a goal
GET    /api/goals/dependency-graph  → all goals + dependencies for current user's org
POST   /api/goals/:id/dependency    → add dependency between goals

CHECK-INS
GET    /api/checkins/goal/:goalId   → all check-ins for a goal
POST   /api/checkins                → employee submits quarterly achievement
PUT    /api/checkins/:id            → update check-in (within window)
POST   /api/checkins/:id/manager-comment → manager adds check-in comment
GET    /api/checkins/team           → all team check-ins for manager
GET    /api/checkins/completion-status → who has/hasn't completed for admin dashboard

REPORTS
GET    /api/reports/achievement     → planned vs actual for all employees
GET    /api/reports/achievement/export?format=csv|excel → file download
GET    /api/reports/completion-dashboard → real-time completion status by employee + manager
GET    /api/reports/manager-effectiveness → per-manager metrics
GET    /api/reports/qoq-trends      → quarter-on-quarter trends
GET    /api/reports/goal-distribution → by thrust area, UoM, status

AUDIT
GET    /api/audit                   → full audit log (Admin)
GET    /api/audit/goal/:goalId      → goal-specific audit

AI ENDPOINTS (calls Anthropic API server-side)
POST   /api/ai/smart-rewrite        → { goalTitle, description } → rewritten SMART goal
POST   /api/ai/conflict-check       → { goals[] } → conflicting goal pairs + explanation
POST   /api/ai/suggest-weightage    → { goals[], thrustAreas[] } → suggested weightages
POST   /api/ai/conversational-checkin → { goalId, quarter, message } → stateful chat, returns { reply, extractedData? }
POST   /api/ai/goal-summary         → { employeeId } → natural language summary of employee's goal health

ML ENDPOINTS (calls Python ML microservice)
POST   /api/ml/predict-achievement  → { employeeId, cycleId } → predicted Q4 achievement per goal
POST   /api/ml/goal-quality         → { title, description } → SMART quality score + dimension breakdown
GET    /api/ml/anomalies            → flagged employees with inconsistent self-reporting
POST   /api/ml/suggest-thrust-area  → { title, description } → predicted thrust area with confidence
GET    /api/ml/sentiment-trends     → { managerId } → sentiment trend of check-in comments per employee

ESCALATIONS
GET    /api/escalations/rules       → all rules (Admin)
POST   /api/escalations/rules       → create rule (Admin)
PUT    /api/escalations/rules/:id   → update rule (Admin)
GET    /api/escalations/log         → escalation event log (Admin)
POST   /api/escalations/trigger-manual → manually trigger escalation check (Admin)

NOTIFICATIONS
GET    /api/notifications           → user's notifications
PUT    /api/notifications/:id/read  → mark as read
PUT    /api/notifications/read-all  → mark all as read

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUSINESS LOGIC — IMPLEMENT EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDATION RULES (enforce server-side AND client-side):
- Total weightage across all submitted goals for one employee in one cycle MUST equal 100%
- Minimum weightage per goal: 10%
- Maximum weightage per goal: 80%
- Maximum goals per employee per cycle: 8
- Minimum goals per employee per cycle: 1
- Goal title: 5–150 characters
- Goal description: 20–500 characters
- Target must be a positive number
- For TIMELINE UoM, targetDate is required and must be within the cycle end date
- For ZERO UoM, target is always 0 and is set automatically

PROGRESS SCORE CALCULATION (compute on every check-in save):
- MIN type (higher is better): score = (actualValue / target) * 100, capped at 120%
- MAX type (lower is better): score = (target / actualValue) * 100, capped at 120%. If actualValue is 0, score = 120%
- TIMELINE type: if completionDate <= targetDate → 100%, else penalty = (completionDate - targetDate) in days / 30, score = max(0, 100 - penalty * 10)%
- ZERO type: if actualValue == 0 → 100%, else 0%
- All scores stored as floats 0–120

GOAL LOCKING:
- On approval: set status to LOCKED, set lockedAt timestamp
- Locked goals: no edits by Employee or Manager
- Any edit post-lock requires Admin to call /unlock, which sets status back to APPROVED temporarily
- Every edit after lock generates an AuditLog entry: who, what field, old value, new value, timestamp

SHARED GOALS:
- When admin pushes a shared goal, create a new Goal record for each recipient
- Set isShared=true, parentGoalId = original goal's id
- Title and Target are copied and marked readOnly in the schema (enforced in API: PATCH on these fields returns 403)
- Recipient can only change weightage
- When primary owner posts a check-in achievement, automatically propagate the actualValue to all linked shared goal check-ins for the same quarter

CHECK-IN WINDOW ENFORCEMENT:
- Check-ins can only be submitted during the appropriate window
- Q1: July 1 – July 31; Q2: Oct 1 – Oct 31; Q3: Jan 1 – Jan 31; Q4: Mar 1 – Apr 30
- Outside windows, check-in submission returns 403 with message "Check-in window not open"
- Admin can override window enforcement via a bypass flag in the cycle config

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND — ALL PAGES & COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GLOBAL:
- Persistent sidebar navigation (role-aware — different links per role)
- Top navbar with: user avatar, role badge, notification bell with unread count, logout
- Notification dropdown: list of notifications with mark-as-read
- Dark/light mode toggle (persist in localStorage)
- Role switcher for demo purposes (top-right, allows switching between seeded accounts)
- Protected routes with role-based guards

AUTH PAGE (/login):
- Email + password form
- Show/hide password toggle
- Error handling with toast
- Redirect to role-specific dashboard on success

━━━━━━━ EMPLOYEE PAGES ━━━━━━━

/employee/dashboard:
- Summary cards: Total Goals, Approved Goals, Avg Progress Score, Pending Actions
- AI Goal Health Score widget — circular gauge showing overall health (0–100) with color coding (red/yellow/green)
- ML Predicted Achievement widget — for each goal, show Q4 predicted score with confidence bar
- Current check-in window status banner (e.g., "Q2 Check-in window is open — 8 days remaining")
- Quick-action buttons: Add Goal, Submit Check-in
- My Goals table: title, thrust area, weightage, status badge, progress score, actions
- Anomaly alert: if ML flags this employee, show a subtle "Check your reporting patterns" info card

/employee/goals:
- List all goals for active cycle with status badges
- "Add Goal" button — opens goal creation panel
- Inline weightage validation: live total shown as employee adds goals, turns red if ≠ 100%
- Each goal row: expand to see full details, check-in history, audit trail
- Submit All Goals button (validates total weightage = 100% before submitting)
- Status flow visualizer: DRAFT → SUBMITTED → APPROVED/REJECTED → LOCKED

/employee/goals/new (or modal):
GOAL CREATION FORM — this is a key UI:
- Field: Thrust Area (dropdown, populated from admin config)
  → As user types goal title + description, auto-call /api/ml/suggest-thrust-area and pre-select suggested area (with confidence shown, e.g., "Suggested: Revenue Growth (87% confidence)")
- Field: Goal Title (text input)
- Field: Description (textarea)
- AI SMART Coach panel (sidebar or inline):
  → As user types, debounced call to /api/ai/smart-rewrite every 2 seconds of inactivity
  → Show side-by-side: "Your Version" vs "SMART Version"
  → Show SMART dimension scores (S/M/A/R/T each rated 1–5 with colored indicators)
  → "Use AI Version" button replaces the form fields with the improved text
  → ML Goal Quality Score shown as a badge (Excellent / Good / Needs Work)
- Field: UoM Type (MIN / MAX / TIMELINE / ZERO) with tooltip explanations
- Field: Target (number input, hidden for ZERO type)
- Field: Target Date (date picker, only shown for TIMELINE type)
- Field: Weightage (number input with live running total shown)
- On submit: client-side + server-side validation

/employee/checkin:
- Only accessible during active check-in window (else shows countdown to next window)
- Tabbed by Quarter (Q1/Q2/Q3/Q4) — tabs greyed out for future quarters
- For each goal in the active quarter:
  - Show: Goal Title, Target, UoM Type, Previous Quarter Score
  - CONVENTIONAL MODE: Number input for actual achievement + status dropdown + optional notes
  - CONVERSATIONAL MODE toggle: switches to a chat interface
    → Chat UI: AI asks "How are you progressing on [Goal Title]? Your target was [X]."
    → Employee responds naturally
    → AI extracts actual value and status, shows preview: "I understood: Achievement = 45, Status = On Track. Confirm?"
    → On confirm, submits the structured data
  - Progress score computed and shown instantly as user enters value
- Submit All Check-ins button

/employee/history:
- Timeline view of all past check-ins across quarters
- Progress score trend chart (line chart per goal over Q1–Q4)
- Manager comments history per goal

━━━━━━━ MANAGER PAGES ━━━━━━━

/manager/dashboard:
- Cards: Team Size, Pending Approvals, Check-ins Due, Team Avg Progress
- Manager Effectiveness Score card: your approval speed (avg hours to approve), check-in completion rate, team achievement trend — with comparison to org average
- Team Progress Heatmap: grid of employees × quarters, color-coded by progress score
- Anomaly alerts: list of team members flagged by ML for inconsistent reporting
- Pending approvals quick-list with one-click approve/reject

/manager/approvals:
- List of all submitted goal sheets awaiting approval
- Click employee → Goal Sheet Review page:
  - Full goal sheet with all goals listed
  - Inline edit: manager can click any Target or Weightage field and edit it directly in the table
  - System re-validates weightage total after manager edits
  - AI Conflict Check: button "Check for Conflicts" → calls /api/ai/conflict-check → shows flagged conflicting goal pairs with AI explanation
  - Approve All / Return for Rework (with comment) buttons
  - Return action requires a comment (mandatory textarea)

/manager/team:
- Team overview table: employee name, goals count, approval status, Q1 score, Q2 score, predicted Q4
- Click employee → detailed view with all their goals + check-in history
- Manager Check-in tab: view each employee's planned vs. actual per quarter per goal
  - Add structured check-in comment per goal per quarter
  - Comments are timestamped and saved
  - Sentiment score shown for previous comments (😊 / 😐 / 😟)

/manager/shared-goals:
- Create a shared/departmental KPI
- Select multiple employees to push it to
- Form: Thrust Area, Title, Description, UoM, Target (recipients cannot change these)
- Recipients shown in a multi-select with their current goal count (warns if pushing would exceed 8 goals)

/manager/analytics:
- QoQ achievement trends: line chart per employee for Q1–Q4 scores
- Goal distribution: pie/donut chart by thrust area
- Team completion rates: bar chart by quarter
- Sentiment trend: line chart showing avg manager comment sentiment per employee over quarters

━━━━━━━ ADMIN PAGES ━━━━━━━

/admin/dashboard:
- Org-wide KPIs: Total Employees, Goals Set %, Check-ins Completed %, Flagged Anomalies
- Completion Dashboard: real-time table — each employee, their manager, goal submission status, Q1/Q2/Q3/Q4 check-in status (✓ or ✗)
- Manager Leaderboard: ranked by effectiveness score (approval speed + check-in completion + team achievement)
- Escalation alert log: recent escalation events

/admin/cycles:
- List all cycles
- Create new cycle: set all window dates
- Edit cycle: update window dates, toggle bypass flag for check-in window enforcement
- Deactivate old cycles

/admin/users:
- Full user management table with search and filter by role/department
- Add user form: name, email, temp password, role, department, assign manager
- Edit user: change role, reassign manager
- Deactivate user (soft delete)
- Org hierarchy view: collapsible tree showing reporting structure

/admin/goals:
- All goals across all employees, filterable by status/thrust area/department/cycle
- Unlock goal: Admin can unlock any locked goal (creates audit log)
- Push shared goal to any set of employees

/admin/escalations:
- Escalation rules CRUD:
  - Rule name, trigger type, days threshold, escalation chain (level 1→2→3)
  - Toggle active/inactive
- Escalation log: timestamped list of all triggered escalations
- Manual trigger button: runs escalation check immediately (for demo purposes)

/admin/reports:
- Achievement Report table: employee, department, manager, goal, target, Q1-Q4 actuals, progress scores
- Export to CSV and Excel (separate buttons)
- Filters: by department, manager, cycle, thrust area
- Completion Dashboard (same as in dashboard but with more filters)

/admin/audit:
- Full audit log table: timestamp, user, goal, action, field, old value, new value
- Filter by date range, user, goal
- Export audit log to CSV

/admin/ml-insights:
- Achievement Prediction table: all employees with predicted Q4 scores per goal, confidence intervals
- Anomaly Detection panel: employees flagged, reason (e.g., "Reports On Track 90% of time but avg score is 42%"), severity
- Goal Quality Distribution: histogram of quality scores across org
- Thrust Area Auto-tag accuracy stats (when ML suggestion was accepted vs. overridden by user)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOAL DEPENDENCY GRAPH (React Flow)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/manager/dependency-graph and /admin/dependency-graph:
- Full-screen React Flow canvas
- Nodes: each goal as a card node showing employee name, goal title, progress score, status badge (color-coded)
- Edges: dependency arrows between goals (A depends on B = arrow from B to A)
- Shared goal indicator: dashed border on shared goal nodes with a "shared" badge
- Node color: green (on track), yellow (at risk), red (behind), grey (not started)
- Click node: side panel slides in with full goal detail + check-in history
- Cascade risk highlighting: if a node is red/behind, all dependent nodes pulse with a warning indicator
- Filter controls: by department, thrust area, quarter
- Zoom/pan/fit-to-screen controls

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI FEATURES — IMPLEMENTATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All AI calls go through the backend (never expose API key to frontend).
Use Anthropic API: model = claude-sonnet-4-20250514, max_tokens = 1000.

1. SMART Goal Rewriter (/api/ai/smart-rewrite):
System prompt: "You are a goal-writing coach. Given an employee's rough goal, rewrite it as a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Also score the original on each SMART dimension (1-5). Return JSON only: { smartVersion: string, scores: { specific: number, measurable: number, achievable: number, relevant: number, timeBound: number }, suggestions: string[] }"
User prompt: "Thrust Area: {thrustArea}. Title: {title}. Description: {description}"

2. Goal Conflict Checker (/api/ai/conflict-check):
System prompt: "You are an OKR expert. Review this employee's goals and identify any that conflict with or undermine each other. Return JSON: { conflicts: [{ goal1Index: number, goal2Index: number, reason: string, severity: 'HIGH'|'MEDIUM'|'LOW' }] }"
User prompt: Pass full goals array as JSON

3. Weightage Suggester (/api/ai/suggest-weightage):
System prompt: "You are an HR expert. Given these goals and the organizational thrust areas, suggest a weightage distribution that adds up to exactly 100%. Prioritize goals aligned with primary thrust areas. Return JSON: { suggestions: [{ goalIndex: number, suggestedWeightage: number, rationale: string }] }"

4. Conversational Check-in (/api/ai/conversational-checkin):
Maintain conversation history in the request body (array of messages).
System prompt: "You are a friendly HR assistant conducting a quarterly goal check-in. Ask the employee about their progress on each goal one at a time. Extract: actual achievement value (number), completion status (NOT_STARTED/ON_TRACK/COMPLETED), and any blockers. Once you have data for a goal, confirm it and move to the next. When all goals are covered, return the extracted data as JSON in a final message. Keep your tone warm and concise."
Stream the response using SSE (Server-Sent Events) for real-time chat feel.

5. Goal Health Summary (/api/ai/goal-summary):
System prompt: "You are an HR analyst. Write a 3-sentence natural language summary of this employee's goal health, highlighting strengths, risks, and recommended actions for their manager."
User prompt: Pass employee's goals + check-in data as JSON

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ML SERVICE — PYTHON FASTAPI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate synthetic training data in data/generate_synthetic_data.py:
- Generate 500 employee-cycle records
- Features: uom_type, weightage, num_goals, q1_score, q2_score, q3_score, days_to_submit, manager_checkin_frequency, department_encoded, thrust_area_encoded
- Target: q4_final_score (float 0–120)
- Add realistic noise and correlations (Q1 score is strongest predictor of Q4)
- Also generate goal text samples with SMART quality labels for the classifier
- Save as CSV files

Models to train and save (joblib):

1. achievement_predictor.py:
   - XGBoost Regressor
   - Features: q1_score, q2_score, uom_type_encoded, weightage, num_goals, days_to_submit, manager_checkin_freq
   - Target: q4_score
   - Output: { predictedScore: float, confidenceInterval: [low, high], featureImportance: {} }

2. goal_quality_classifier.py:
   - TF-IDF vectorizer + Logistic Regression multi-label classifier
   - Input: goal title + description text
   - Output: { qualityScore: float (0-100), label: "Excellent"|"Good"|"Needs Work"|"Poor", dimensionScores: { specific, measurable, achievable, relevant, timeBound } }

3. anomaly_detector.py:
   - Isolation Forest on check-in patterns
   - Features per employee: avg_reported_status_score (NOT_STARTED=0, ON_TRACK=0.5, COMPLETED=1), avg_actual_progress_score, std_dev_of_scores, q1_to_q2_delta
   - Output: { isAnomaly: bool, anomalyScore: float, reason: string }

4. thrust_area_tagger.py:
   - sentence-transformers (all-MiniLM-L6-v2) for zero-shot classification
   - Given thrust areas configured in the system, embed them
   - Embed input goal text and find nearest thrust area by cosine similarity
   - Output: { suggestedThrustArea: string, confidence: float, allScores: {} }

5. sentiment_analyzer.py:
   - VADER SentimentIntensityAnalyzer on manager check-in comments
   - Output: compound score -1 to 1 per comment, trend array over quarters

FastAPI endpoints:
POST /predict-achievement
POST /goal-quality
GET  /anomalies (takes employee_ids query param)
POST /suggest-thrust-area
POST /sentiment { comments: string[] }

Run train.py to generate data, train all models, and save to models/ directory.
On startup, load all saved models into memory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESCALATION ENGINE (node-cron)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run every 6 hours via cron job in backend/src/jobs/escalation.job.ts:

For each active escalation rule, check:
1. GOAL_NOT_SUBMITTED: Employee has not submitted goals within N days of cycle opening
   → Level 1: notify employee. Level 2 (after another N days): notify manager. Level 3: notify Admin/HR
2. APPROVAL_PENDING: Manager has not approved submitted goals within N days
   → Level 1: notify manager. Level 2: notify skip-level/Admin
3. CHECKIN_MISSING: Employee has not completed check-in within N days of window opening
   → Level 1: notify employee. Level 2: notify manager. Level 3: notify Admin

For each triggered escalation:
- Create a Notification record for the target user
- Send email via Nodemailer (log to console if SMTP not configured — use ethereal.email for testing)
- Log to EscalationLog table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPORTING & EXPORTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Achievement Report CSV columns:
Employee Name, Department, Manager, Thrust Area, Goal Title, UoM, Target, 
Q1 Actual, Q1 Score, Q2 Actual, Q2 Score, Q3 Actual, Q3 Score, Q4 Actual, Q4 Score, Status

Excel export: same data, but with:
- Conditional formatting: cells below 60% score in red, 60-80% in yellow, above 80% in green
- Summary tab: department-level averages

Completion Dashboard data:
- Employee name, manager, goals submitted (yes/no), goals approved (yes/no), Q1-Q4 check-in done (yes/no each)

Audit Log export: timestamp, user email, role, goal title, action, field, old value, new value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR HANDLING & EDGE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Handle ALL of these explicitly:
- Submitting goals when total weightage ≠ 100% → 400 with field-level error
- Editing a locked goal → 403 "Goal is locked. Contact admin to unlock."
- Submitting check-in outside window → 403 "Check-in window not open. Opens [date]."
- Manager approving goals where weightage ≠ 100% after inline edits → re-validate server-side
- Employee trying to delete an approved goal → 403
- Shared goal recipient trying to edit title/target → 403
- Division by zero in MAX UoM score calculation → handle actualValue = 0 case
- ML service unavailable → graceful fallback, show "AI insights temporarily unavailable" (never break the main app)
- Anthropic API timeout → return 503 with user-friendly message
- All API errors return: { error: { code: string, message: string, details?: any } }
- JWT expired → return 401, frontend intercepts and calls refresh endpoint, retries original request

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT CONFIG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/.env:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalforge
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret
ANTHROPIC_API_KEY=your-anthropic-api-key
ML_SERVICE_URL=http://localhost:8001
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
PORT=3001

frontend/.env:
VITE_API_URL=http://localhost:3001/api

ml-service/.env:
PORT=8001

docker-compose.yml: wire up postgres, backend, frontend, ml-service with correct env vars and port mappings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHITECTURE DIAGRAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate architecture.md that describes:
- React frontend → Express backend (REST + SSE)
- Express backend → PostgreSQL (Prisma)
- Express backend → Anthropic API (AI features)
- Express backend → Python ML microservice (ML features)
- Node-cron escalation engine within backend
- Nodemailer for email
- All services containerized via Docker

Also generate a simple ASCII architecture diagram in architecture.md.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
README
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a comprehensive README.md with:
- Project overview and feature list
- Prerequisites (Node 20, Python 3.11, PostgreSQL, Docker)
- Setup instructions (with and without Docker)
- How to run the ML training step
- Seeded demo credentials table (all 13 users with email/password/role)
- API documentation summary
- Architecture overview
- Environment variables reference

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- TypeScript strict mode everywhere (no `any` unless absolutely necessary)
- All API routes have input validation (Zod schemas on backend)
- All sensitive routes have auth middleware + role guard middleware
- Frontend has loading states, empty states, and error states for every data-fetching component
- Mobile responsive (Tailwind responsive classes throughout)
- No placeholder "TODO" comments — every feature is implemented
- The app must run from scratch with: docker-compose up
- After docker-compose up, running the seed gives working demo credentials immediately

Build the complete application now, starting with: docker-compose.yml → prisma schema → backend API → ML service → frontend. 
Do not stop until every file is complete and the application is fully functional.