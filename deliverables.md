Here is a comprehensive breakdown of everything mentioned in the document:

---

# AtomQuest Hackathon 1.0 — In-House Goal Setting & Tracking Portal

---

## 🎯 Core Problem Being Solved

Organizations using spreadsheets, emails, and offline reviews face:
- No real-time progress visibility for managers
- Employees disconnected from org-level priorities
- HR teams scrambling to piece together data at appraisal time

The solution must cover the **full goal lifecycle**: creation → approval → quarterly check-ins → performance visibility.

---

## 📦 Submission Deliverables (Section 8)

| # | Deliverable |
|---|---|
| 1 | **Live/hosted demo URL** of the portal |
| 2 | **Source code repository** (GitHub / GitLab / Bitbucket) |
| 3 | **Architecture diagram** (PDF or image) explaining tech & hosting |
| 4 | **Login credentials for all 3 roles** (Employee, Manager, Admin) OR a role-switcher in the app |

---

## 👤 User Roles & Their Capabilities (Section 3)

### Employee
- Draft and create goals
- Enter quarterly achievement data
- Update progress status
- View goals after they are locked (read-only post-approval)

### Manager (L1)
- Review and approve submitted goals
- Inline edit targets/weightages during approval
- Return goals to employee for rework
- Conduct quarterly check-ins for each team member
- Log feedback/comments during check-ins
- Access a team dashboard

### Admin / HR
- Configure goal-setting cycles
- Manage org hierarchy
- Oversee completion rates across the organization
- Handle exceptions (e.g., unlock goals after lock date)
- View audit logs
- Push shared/departmental goals to multiple employees

---

## 🔧 Phase 1 — Goal Creation & Approval (Must-Have)

### Employee Goal Sheet Interface
- Select a **Thrust Area** for each goal
- Define **Goal Title** and **Goal Description**
- Assign a **Unit of Measurement (UoM)** — four types:
  - Numeric
  - % (Percentage)
  - Timeline (date-based)
  - Zero-based (zero = success, e.g., safety incidents)
- Set **Target value** per goal
- Set **Weightage** per goal

### System-Enforced Validation Rules
- Total weightage across all goals **must equal exactly 100%**
- Minimum weightage per individual goal: **10%**
- Maximum number of goals per employee: **8 goals**

### Manager (L1) Approval Workflow
- Manager can **review** submitted goal sheets
- Manager can **inline edit** targets and weightages directly
- Manager can **return** goals to the employee for rework
- On approval, goals are **locked** — no further edits allowed without Admin intervention

### Shared Goals Functionality
- Admin or Manager can **push a departmental KPI** to multiple employees simultaneously
- Recipients can **adjust weightage only** — Goal Title and Target are read-only on shared goals
- Achievement updates by the **primary owner automatically sync** across all linked employee goal sheets

---

## 📊 Phase 2 — Achievement Tracking & Quarterly Check-ins (Must-Have)

### Employee Achievement Interface
- Quarterly update interface to log **Actual Achievement** against Planned Targets
- Status selection per goal (3 statuses):
  - **Not Started**
  - **On Track**
  - **Completed**

### Manager Check-in Module
- View **Planned vs. Actual Achievement** data for each team member
- Add a **structured Check-in Comment** to document the discussion

### System-Computed Progress Scores
Scores are for tracking only — **not used for performance ratings**.

| UoM Type | When Used | Formula |
|---|---|---|
| Min (Numeric / %) | Higher is better (e.g., Sales Revenue) | Achievement ÷ Target |
| Max (Numeric / %) | Lower is better (e.g., TAT, Cost) | Target ÷ Achievement |
| Timeline | Date-based completion | Completion date vs. Deadline |
| Zero | Zero = Success (e.g., safety incidents) | If 0 → 100%, else 0% |

---

## 📅 Check-in Schedule (Section 2.3)

The portal must **enforce** these quarterly windows:

| Period | Window Opens | Action |
|---|---|---|
| Phase 1 — Goal Setting | 1st May | Goal Creation, Submission & Approval |
| Q1 Check-in | July | Progress Update — Planned vs. Actual |
| Q2 Check-in | October | Progress Update — Planned vs. Actual |
| Q3 Check-in | January | Progress Update — Planned vs. Actual |
| Q4 / Annual | March / April | Final Achievement Capture |

---

## 📈 Reporting & Governance (Section 4)

### 1. Achievement Report
- Exportable in **CSV / Excel**
- Shows Planned Target vs. Actual Achievement for **all employees**

### 2. Completion Dashboard
- **Real-time view** of which employees and managers have completed quarterly check-ins
- Shows completion status across the org

### 3. Audit Trail
- System must log **all changes made to goals after the lock date**
- Must capture: **who** changed what, **what** was changed, and **when**

---

## ⭐ Good-to-Have / Bonus Features (Section 5)

### 5.1 Microsoft Entra ID (Azure AD) Integration
- **Single Sign-On (SSO)** for employees and managers
- **Automatic org hierarchy sync** — reporting lines pulled from Azure AD attributes
- **Role assignment** mapped from Azure AD group membership

### 5.2 Email & Microsoft Teams Integration
- Automated **email notifications** for: goal submission, approval, rejection, check-in reminders
- **Teams bot or adaptive card notifications** for managers when a team member submits/updates goals
- **Deep-link support** — clicking a Teams notification navigates directly to the relevant goal sheet

### 5.3 Escalation Module (Rule-Based)
- Configurable escalation rules triggered by conditions such as:
  - Employee hasn't submitted goals within N days of cycle open
  - Manager hasn't approved goals within N days of submission
  - Quarterly check-in not completed within the active window
- **Escalation chain**: auto-notify employee → then manager → then skip-level/HR after defined intervals
- **Escalation log** visible to Admin/HR for tracking and resolution

### 5.4 Analytics Module
- **Quarter-on-Quarter (QoQ) achievement trends** at individual, team, and department levels
- **Heatmaps or progress charts** showing completion rates across the org
- **Goal distribution analysis** — broken down by Thrust Area, UoM type, and goal status
- **Manager effectiveness dashboard** — compares check-in completion rates across L1 managers

---

## 🏆 Evaluation Parameters (Section 6)

All 6 parameters carry **equal weight**:

| # | Parameter | What's Being Assessed |
|---|---|---|
| 1 | Functionality | Does the full end-to-end flow work without errors? |
| 2 | Adherence to BRD | Are all Phase 1 & 2 requirements implemented with correct validation rules? |
| 3 | User Friendliness | Intuitive UI, logical workflows, helpful error messages, consistent across roles |
| 4 | Absence of Bugs | Correct behavior under normal and edge-case inputs; no broken flows or data inconsistencies |
| 5 | Good-to-Have Features | Depth and quality of bonus feature implementation |
| 6 | Cost Optimisation | Infrastructure choices, API call efficiency, caching strategies, hosting cost awareness |

---

## ⚙️ Constraints & Ground Rules (Section 7)

- Any tech stack is allowed (frameworks, databases, cloud)
- Must be a **web browser-accessible** portal — no desktop-only apps
- Must demo **at least one complete user journey per role** (Employee, Manager, Admin)
- Code must be **version-controlled** and the repository link submitted before the deadline
- Must include a **brief architecture diagram** explaining tech and hosting choices

---

## 🔑 Summary: Non-Negotiable Must-Haves

1. Goal creation form with Thrust Area, UoM, Target, Weightage
2. Validation: 100% total weightage, min 10% per goal, max 8 goals
3. Manager approval flow with inline editing and rework capability
4. Goal locking post-approval (Admin override only)
5. Shared Goals with sync across linked employees
6. Quarterly achievement entry with status selection (3 statuses)
7. Manager check-in with comments
8. 4 UoM-specific progress score formulas
9. Enforced quarterly schedule windows
10. Achievement Report (CSV/Excel export)
11. Real-time completion dashboard
12. Full audit trail for post-lock changes
13. 3 distinct roles with separate access levels
14. Working demo with all 3 role journeys