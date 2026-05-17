// All shared TypeScript interfaces for GoalForge

export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export type UoMType = 'MIN' | 'MAX' | 'TIMELINE' | 'ZERO';
export type GoalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type CheckInStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED';
export type GoalSensitivity = 'NORMAL' | 'TECHNICAL' | 'FINANCIAL';
export type AuthProvider = 'LOCAL' | 'MICROSOFT_DEMO';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'TEAMS';
export type KudosBadgeType =
  | 'COLLABORATOR'
  | 'PROBLEM_SOLVER'
  | 'INNOVATION_SPARK'
  | 'CUSTOMER_CHAMPION'
  | 'EXECUTION_ACE';

export interface User {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  jobTitle?: string | null;
  managerId: string | null;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  goalSettingOpen: string;
  q1Open: string;
  q2Open: string;
  q3Open: string;
  q4Open: string;
  bypassWindow: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  user?: User;
  cycleId: string;
  cycle?: Cycle;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UoMType;
  target: number;
  targetDate?: string;
  weightage: number;
  sensitivity?: GoalSensitivity;
  status: GoalStatus;
  isShared: boolean;
  parentGoalId?: string;
  qualityScore?: number;
  qualityFeedback?: Record<string, unknown>;
  managerComment?: string;
  lockedAt?: string;
  checkIns?: CheckIn[];
  kudos?: Kudos[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalTreeNode {
  id: string;
  kind: 'user' | 'goal';
  entityId: string;
  title: string;
  subtitle: string;
  ownerName: string;
  status: string;
  progressScore: number;
  isShared: boolean;
  parentGoalId?: string | null;
}

export interface GoalTreeLink {
  id: string;
  source: string;
  target: string;
  type: 'org' | 'ownership' | 'shared' | 'dependency';
}

export interface CheckIn {
  id: string;
  goalId: string;
  goal?: Goal;
  userId: string;
  user?: User;
  quarter: Quarter;
  actualValue: number;
  completionDate?: string;
  status: CheckInStatus;
  progressScore: number;
  employeeNote?: string;
  managerComment?: string;
  managerCheckedAt?: string;
  sentiment?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  goalId?: string;
  goal?: Goal;
  userId: string;
  user?: User;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel?: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerType: 'GOAL_NOT_SUBMITTED' | 'APPROVAL_PENDING' | 'CHECKIN_MISSING';
  daysThreshold: number;
  isActive: boolean;
  escalationChain: Array<{ level: number; notifyRole: string }>;
}

export interface Kudos {
  id: string;
  senderId: string;
  receiverId: string;
  goalId?: string | null;
  badgeType: KudosBadgeType;
  note: string;
  createdAt: string;
  sender?: Pick<User, 'id' | 'name' | 'department'>;
  receiver?: Pick<User, 'id' | 'name' | 'department'>;
  goal?: Pick<Goal, 'id' | 'title'>;
}

export interface ApprovalDelegation {
  id: string;
  delegatorManagerId: string;
  delegateManagerId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  delegatorManager?: Pick<User, 'id' | 'name' | 'department'>;
  delegateManager?: Pick<User, 'id' | 'name' | 'department'>;
}

export interface TeamSentimentSummary {
  trends: Array<{ quarter: Quarter; avgSentiment: number; sampleSize: number }>;
  burnoutRisk: { high: number; medium: number; low: number };
  engagementScore: number;
  latestAverage: number;
  alertFlags: string[];
}

export interface FlightRiskEmployee {
  userId: string;
  userName: string;
  department: string;
  jobTitle?: string | null;
  managerName?: string | null;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  avgSentiment: number;
  sentimentTrend: number;
  afterHoursActivityRate: number;
  maxCapacityGoals: number;
  avgProgress: number;
  kudosCount: number;
  reasons: string[];
  explainability: Array<{
    factor: string;
    value: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }>;
  confidence: number;
  recommendedAction: string;
}

export interface FlightRiskReport {
  summary: { high: number; medium: number; low: number };
  employees: FlightRiskEmployee[];
}

export interface LeaderboardRow {
  department: string;
  onTimeCompliance: number;
  averageProgress: number;
  kudosEarned: number;
  healthySentimentRate: number;
}

// ---- API Response types ----

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---- AI / ML types ----

export interface SmartRewriteResponse {
  smartVersion: string;
  scores: {
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    timeBound: number;
  };
  suggestions: string[];
}

export interface PerformanceReviewDraftResponse {
  employee: {
    id: string;
    name: string;
    managerName?: string | null;
  };
  draft: string;
  highlights: string[];
}

export interface CalibrationCopilotEmployee {
  userId: string;
  userName: string;
  managerName?: string | null;
  department: string;
  avgProgress: number;
  lockedRate: number;
  avgSentiment: number;
  kudosCount: number;
  compositeScore: number;
  suggestedRating: 'OUTSTANDING' | 'EXCEEDS' | 'MEETS' | 'DEVELOPING' | 'AT_RISK';
  inflationRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string[];
  recommendation: string;
}

export interface CalibrationCopilotReport {
  summary: {
    teamSize: number;
    scoreSpread: number;
    inflationHotspots: number;
    distribution: Record<string, number>;
  };
  employees: CalibrationCopilotEmployee[];
}

export interface NarrativeIntelligenceResponse {
  narrative: string;
  sentiment: TeamSentimentSummary;
  risk: FlightRiskReport;
  portfolio: {
    goalCount: number;
    pendingApprovals: number;
    dependencyLoad: number;
    avgProgress: number;
  };
}

export interface WhatIfSimulationResponse {
  goal: {
    id: string;
    title: string;
    ownerName: string;
  };
  before: {
    weightage: number;
    ownerPortfolioWeight: number;
    teamAverageProgress: number;
    ownerRiskScore: number | null;
    alignmentCoverage: number;
  };
  after: {
    weightage: number;
    ownerPortfolioWeight: number;
    teamAverageProgress: number;
    ownerRiskScore: number;
    alignmentCoverage: number;
  };
  insights: string[];
}

export interface GoalAutopilotGoal {
  thrustArea: string;
  title: string;
  description: string;
  uomType: UoMType;
  target: number;
  targetDate?: string | null;
  weightage: number;
  rationale: string;
  sensitivity?: GoalSensitivity;
}

export interface GoalQualityResponse {
  qualityScore: number;
  label: 'Excellent' | 'Good' | 'Needs Work' | 'Poor';
  dimensionScores: {
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    timeBound: number;
  };
}

export interface ConflictCheckResponse {
  conflicts: Array<{
    goal1Index: number;
    goal2Index: number;
    reason: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

export interface AchievementPrediction {
  goalId: string;
  goalTitle: string;
  predictedScore: number;
  confidenceInterval: [number, number];
  featureImportance: Record<string, number>;
}

export interface AnomalyResult {
  userId: string;
  userName: string;
  isAnomaly: boolean;
  anomalyScore: number;
  reason: string;
}

export interface ThrustAreaSuggestion {
  suggestedThrustArea: string;
  confidence: number;
  allScores: Record<string, number>;
}

// ---- Report types ----

export interface AchievementReportRow {
  employeeName: string;
  department: string;
  manager: string;
  thrustArea: string;
  goalTitle: string;
  uom: string;
  target: number;
  q1Actual?: number; q1Score?: number;
  q2Actual?: number; q2Score?: number;
  q3Actual?: number; q3Score?: number;
  q4Actual?: number; q4Score?: number;
  status: GoalStatus;
}

export interface CompletionDashboardRow {
  employeeName: string;
  manager: string;
  goalsSubmitted: boolean;
  goalsApproved: boolean;
  q1Done: boolean;
  q2Done: boolean;
  q3Done: boolean;
  q4Done: boolean;
}

export interface ExternalSyncResult {
  quarter: Quarter;
  progressScore: number;
  status: CheckInStatus;
  message: string;
  checkIn: CheckIn;
  goal: Goal;
}

export interface ChatOpsResponse {
  platform: string;
  message: string;
  goal?: Goal;
  checkIn?: CheckIn;
  parsed?: {
    intent: 'update_target' | 'log_progress' | 'update_status' | 'unknown';
    goalId: string | null;
    value: number | null;
    status: CheckInStatus | null;
  };
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventName: string;
  status: string;
  statusCode?: number | null;
  responseBody?: string | null;
  attemptCount: number;
  createdAt: string;
  deliveredAt?: string | null;
  endpoint?: {
    id: string;
    name: string;
    url: string;
  };
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  subscribedEvents: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveredAt?: string | null;
  deliveries?: WebhookDelivery[];
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description?: string | null;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DomainEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventName: string;
  status: string;
  correlationId?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  payload: Record<string, unknown>;
}

export interface PlatformOverviewResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    webhookSecret: string;
    branding?: Record<string, unknown> | null;
  } | null;
  summary: {
    activeWebhookEndpoints: number;
    recentDeliveryFailures: number;
    enabledFlags: number;
    recordedEvents: number;
  };
  endpoints: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  flags: FeatureFlag[];
  events: DomainEvent[];
}

// ---- Window status ----

export interface CycleWindowStatus {
  goalSettingOpen: boolean;
  q1Open: boolean;
  q2Open: boolean;
  q3Open: boolean;
  q4Open: boolean;
  activeQuarter: Quarter | null;
  nextWindowDate: string | null;
  daysRemaining: number | null;
}

// Aliases
export type PredictionResult = AchievementPrediction;
