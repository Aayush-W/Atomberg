# GoalForge - AtomQuest Hackathon Edition 🚀

**GoalForge (AutoYield AI)** is a next-generation, intelligent goal-setting and performance tracking platform built for the modern enterprise.

### 💡 The Noble Idea
Traditional performance management is often top-down, anxiety-inducing, and heavily siloed. The noble idea behind GoalForge is to democratize organizational growth by creating a transparent, highly-aligned, and intelligent ecosystem. We transition goal-tracking from tedious "manual data entry" to "proactive intelligence". By leveraging Machine Learning to track team sentiment and automating cascading shared-goals, we eliminate corporate misalignment and foster a healthier, highly-engaged workplace where every employee can visually see how their daily tasks impact the company's grand vision.

---

## ✨ Latest Hackathon Features
- **Strict Quarterly Windows**: Actively enforces 21-day check-in windows. The system securely blocks backdating or future-dating check-ins to ensure data integrity.
- **Cascading Shared Goals**: When a manager updates their progress, the system automatically cascades achievements and scores down to all shared employee sub-goals via a seamless database sync.
- **Complex Unit of Measurement (UoM) Computations**: Support for nuanced scoring (`MIN`, `MAX`, `ZERO`, `TIMELINE`). The system perfectly handles degrading scores for late timeline completions.
- **100% Goal Weightage Allowance**: Complete flexibility in metric distribution while enforcing a hard 100% total cap across the goal sheet.
- **Integrated ML Intelligence**: Sentiment analysis on manager feedback and predictive goal quality scoring via the built-in Python FastAPI service.

---

## ⚙️ Quick Start (Docker)

To spin up the Postgres DB, Node.js Backend, React Frontend, and Python ML Service simultaneously:

```bash
docker-compose up -d --build
```
Then, execute the database push and seed to initialize the schema and test accounts:
```bash
docker exec goalforge-backend npx prisma db push --accept-data-loss
docker exec goalforge-backend npm run prisma db seed
```
Access the application at: **http://localhost:5173**

---

## 🧪 End-to-End Testing Workflow

Want to see the magic in action? Follow this exact flow using our seeded test accounts!

### Step 1: The Employee Experience
1. **Login:** `alice@goalforge.com` / `Employee@123`
2. **Action:** Navigate to **Goal Setting**.
3. **Test:** Create a new Goal. Set the weightage to `100` and submit the sheet. *(Note how it securely accepts 100% max weightage)*.
4. **Test:** Navigate to **My Goals** and log a check-in. Try logging it for `Q4` (which is currently closed) and watch the system correctly block you. Log it for `Q1` instead.

### Step 2: The Shared Goal Sync (Manager)
1. **Login:** `manager1@goalforge.com` / `Manager@123`
2. **Action:** Navigate to your dashboard and locate your "Shared Goal" (which has also been distributed to your team).
3. **Test:** Log a check-in on this parent goal. 
4. **Test:** Log out, and sign in as `carmen@goalforge.com` (your team member). You will immediately see that her goal dashboard has automatically inherited your progress updates seamlessly! *(Note: Try to edit her shared goal progress manually; the system will block you!)*

### Step 3: Complex Formulas (Manager)
1. **Login:** `manager1@goalforge.com` / `Manager@123`
2. **Test:** Create a `MAX` goal (e.g. "Reduce costs") with a target of 50. Log a check-in with an actual value of 25. Watch the system accurately assign a 100% progress score!

### Step 4: Admin & Machine Learning
1. **Login:** `admin@goalforge.com` / `Admin@123`
2. **Action:** Navigate to **ML Insights**.
3. **Test:** View the Sentiment Trends chart to see how the Python FastAPI service actively evaluates manager check-in comments to predict organizational health and burnout risk.
