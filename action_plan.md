Read the file named prompt.md (or whatever the prompt file is called) in the root of this project. That is your complete specification. You are now the lead engineer on this project. Execute the full build autonomously.

Follow this exact build order — do not skip steps, do not move to the next step until the current one compiles and works:

STEP 1 — FOUNDATION
- Create docker-compose.yml with services: postgres, backend, ml-service, frontend
- Create the full directory structure as specified
- Create all .env files with the values from the spec
- Create backend/package.json with all dependencies listed in the spec
- Create frontend/package.json with all dependencies listed in the spec  
- Create ml-service/requirements.txt with all Python dependencies
- Verify: docker-compose config passes with no errors

STEP 2 — DATABASE
- Write the complete prisma/schema.prisma with every model, field, enum, and relation from the spec
- Write backend/src/index.ts with Express server bootstrap, middleware, and route mounting
- Run: npx prisma migrate dev --name init
- Write prisma/seed.ts with ALL seeded data: 1 admin, 3 managers, 9 employees, 1 active cycle, thrust areas, sample goals in various states, sample check-in data
- Run: npx ts-node prisma/seed.ts
- Verify: all 13 users exist in DB, goals and check-ins are seeded

STEP 3 — BACKEND AUTH & MIDDLEWARE
- Write JWT auth middleware (access + refresh token logic)
- Write role guard middleware (EMPLOYEE, MANAGER, ADMIN)
- Write auth controller and routes (login, refresh, logout, me)
- Write input validation schemas (Zod) for all request bodies
- Write global error handler middleware
- Verify: POST /api/auth/login with admin@goalforge.com / Admin@123 returns tokens

STEP 4 — BACKEND CORE API
Build controllers and routes in this order, testing each:
- Users controller + routes (all endpoints from spec)
- Cycles controller + routes
- Goals controller + routes — implement ALL business logic:
  * Weightage validation (sum=100, min 10%, max 8 goals)
  * Goal locking on approval
  * Shared goal propagation
  * Audit log generation on every post-lock change
  * Check-in window enforcement
- Check-ins controller + routes — implement ALL progress score formulas (MIN/MAX/TIMELINE/ZERO)
- Reports controller + routes (achievement, completion, manager effectiveness, QoQ trends)
- Audit controller + routes
- Notifications controller + routes
- Verify: all endpoints return correct data for seeded users

STEP 5 — AI INTEGRATION (Backend)
- Write ai.service.ts with Anthropic API client
- Implement all 5 AI endpoints with the exact system prompts from the spec:
  * /api/ai/smart-rewrite
  * /api/ai/conflict-check  
  * /api/ai/suggest-weightage
  * /api/ai/conversational-checkin (with SSE streaming)
  * /api/ai/goal-summary
- Verify: each endpoint returns correctly shaped JSON

STEP 6 — ML SERVICE
- Write ml-service/data/generate_synthetic_data.py — generate 500 records, save to CSV
- Run: python generate_synthetic_data.py
- Write and train all 5 models:
  * achievement_predictor.py (XGBoost regression)
  * goal_quality_classifier.py (TF-IDF + Logistic Regression)
  * anomaly_detector.py (Isolation Forest)
  * thrust_area_tagger.py (sentence-transformers zero-shot)
  * sentiment_analyzer.py (VADER)
- Write train.py that runs all training and saves models with joblib
- Run: python train.py
- Write main.py FastAPI app with all endpoints from spec, loading saved models on startup
- Verify: uvicorn starts, POST /predict-achievement returns a prediction

STEP 7 — ESCALATION ENGINE
- Write backend/src/jobs/escalation.job.ts
- Implement all 3 trigger types (GOAL_NOT_SUBMITTED, APPROVAL_PENDING, CHECKIN_MISSING)
- Implement multi-level escalation chain logic
- Wire Nodemailer (use Ethereal for testing)
- Register cron job in main Express app (every 6 hours)
- Add manual trigger endpoint for demo

STEP 8 — FRONTEND FOUNDATION
- Set up React Router with all routes and role-based guards
- Build the persistent sidebar (role-aware navigation links)
- Build the top navbar (avatar, role badge, notification bell, dark/light toggle, role switcher for demo)
- Build the notification dropdown component
- Set up Zustand stores: authStore, notificationStore, uiStore
- Set up Axios instance with interceptors (auto-refresh JWT on 401, attach token to all requests)
- Set up React Query client with global error handling
- Build reusable components: Button, Input, Select, Modal, Badge, Card, Table, Spinner, EmptyState, ErrorState

STEP 9 — AUTH PAGE
- Build /login page with form validation, show/hide password, error toast
- Wire to /api/auth/login, store tokens in authStore
- Redirect to role-specific dashboard on success

STEP 10 — EMPLOYEE PAGES
Build in this order, each fully functional:
1. /employee/dashboard — all 4 summary cards, AI health gauge, ML prediction widget, check-in window banner, goals table, anomaly alert
2. /employee/goals — goal list with status badges, inline weightage total, submit all button, status flow visualizer
3. /employee/goals/new — full goal creation form with:
   - Live thrust area auto-suggestion (ML)
   - Debounced SMART rewriter (AI side panel)
   - SMART dimension scores display
   - UoM-aware field rendering
   - Live weightage total
4. /employee/checkin — quarterly tabs, conventional + conversational modes, live progress score preview
5. /employee/history — timeline view, progress trend line chart per goal, manager comments

STEP 11 — MANAGER PAGES
1. /manager/dashboard — team cards, effectiveness score, team heatmap, anomaly alerts, pending approvals list
2. /manager/approvals — goal sheet review with inline editing, AI conflict checker, approve/reject with comment
3. /manager/team — team table with predicted scores, employee detail view, check-in comment interface with sentiment display
4. /manager/shared-goals — push KPI to multiple employees with goal count warnings
5. /manager/analytics — QoQ trend chart, distribution pie chart, completion bar chart, sentiment trend line chart

STEP 12 — ADMIN PAGES
1. /admin/dashboard — org KPIs, completion dashboard table, manager leaderboard, escalation log
2. /admin/cycles — cycle CRUD with all window dates, bypass flag toggle
3. /admin/users — user table with search/filter, add/edit user, org hierarchy tree view
4. /admin/goals — all goals filterable, unlock goal, push shared goal
5. /admin/escalations — rules CRUD, escalation log, manual trigger button
6. /admin/reports — achievement report table with filters, export CSV + Excel buttons, completion dashboard
7. /admin/audit — full audit log with filters + export
8. /admin/ml-insights — prediction table, anomaly panel, quality distribution histogram, thrust area accuracy stats

STEP 13 — GOAL DEPENDENCY GRAPH
- Build the React Flow canvas page (accessible from /manager/dependency-graph and /admin/dependency-graph)
- Custom goal card nodes with: employee name, goal title, progress score, status badge, color coding
- Dependency edges with arrows
- Shared goal node styling (dashed border + badge)
- Cascade risk pulse animation on at-risk nodes and their dependents
- Click-to-open side panel with full goal detail
- Filter controls by department/thrust area/quarter
- Zoom/pan/fit controls

STEP 14 — EXPORTS & REPORTS
- Implement CSV export with correct columns from spec
- Implement Excel export (exceljs) with conditional color formatting and summary tab
- Audit log export
- Wire all export buttons in frontend to trigger file downloads

STEP 15 — POLISH & VERIFICATION
- Add loading states to every data-fetching component
- Add empty states (with helpful illustrations/text) to every list/table
- Add error states with retry buttons
- Verify mobile responsiveness (test all pages at 375px width)
- Verify all edge cases from spec are handled (locked goal edit, window enforcement, weightage validation, division by zero, ML service down graceful fallback)
- Verify the role switcher demo widget works (switch between admin@goalforge.com, manager1@goalforge.com, emp1@goalforge.com instantly)

STEP 16 — DOCUMENTATION
- Write comprehensive README.md (all sections from spec)
- Write architecture.md with ASCII diagram
- Verify docker-compose up brings up the entire stack cleanly

After each step, tell me:
✅ What was built
🔧 Any deviations from spec and why
⚠️ Anything that needs my input before continuing

Start with STEP 1 now.