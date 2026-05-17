// Add missing services to the API layer
import { api } from './api';
import type {
  Goal, CheckIn, Cycle, User, Notification,
  SmartRewriteResponse, ConflictCheckResponse,
  ThrustAreaSuggestion, AnomalyResult, PredictionResult,
  EscalationRule, AuditLog, GoalAutopilotGoal, Kudos, ApprovalDelegation, TeamSentimentSummary, LeaderboardRow,
  PerformanceReviewDraftResponse, FlightRiskReport, ExternalSyncResult, ChatOpsResponse,
  CalibrationCopilotReport, NarrativeIntelligenceResponse, WhatIfSimulationResponse, WebhookEndpoint, WebhookDelivery, FeatureFlag,
  PlatformOverviewResponse, DomainEvent,
} from '@/types';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r: any) => r.data),
  refresh: (token: string) => api.post('/auth/refresh', { refreshToken: token }).then((r: any) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r: any) => r.data.user as User),
  getMicrosoftProfiles: () => api.get('/auth/microsoft/start').then((r: any) => r.data),
  loginWithMicrosoftDemo: (email: string) => api.get('/auth/microsoft/callback', { params: { email } }).then((r: any) => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersService = {
  getAll: () => api.get('/users').then((r: any) => r.data.users as User[]),
  getManagers: () => api.get('/users/managers').then((r: any) => r.data.users as User[]),
  getTeam: (managerId: string) => api.get(`/users/team/${managerId}`).then((r: any) => r.data.users as User[]),
  getById: (id: string) => api.get(`/users/${id}`).then((r: any) => r.data.user as User),
  create: (data: Partial<User> & { password?: string }) => api.post('/users', data).then((r: any) => r.data.user),
  update: (id: string, data: Partial<User>) => api.put(`/users/${id}`, data).then((r: any) => r.data.user),
};

// ─── Cycles ───────────────────────────────────────────────────────────────────
export const cyclesService = {
  getAll: () => api.get('/cycles').then((r: any) => r.data.cycles as Cycle[]),
  getActive: () => api.get('/cycles/active').then((r: any) => r.data.cycle as Cycle),
  getStatus: (id: string) => api.get(`/cycles/${id}/status`).then((r: any) => r.data.status),
  create: (data: Partial<Cycle>) => api.post('/cycles', data).then((r: any) => r.data.cycle),
  update: (id: string, data: Partial<Cycle>) => api.put(`/cycles/${id}`, data).then((r: any) => r.data.cycle),
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goalsService = {
  getMine: () => api.get('/goals').then((r: any) => r.data.goals as Goal[] || []),
  getTeam: () => api.get('/goals/team').then((r: any) => r.data.goals as Goal[]),
  getAll: () => api.get('/goals/all').then((r: any) => r.data.goals as Goal[]),
  getById: (id: string) => api.get(`/goals/${id}`).then((r: any) => r.data.goal as Goal),
  create: (data: Partial<Goal>) => api.post('/goals', data).then((r: any) => r.data.goal),
  update: (id: string, data: Partial<Goal>) => api.put(`/goals/${id}`, data).then((r: any) => r.data.goal),
  delete: (id: string) => api.delete(`/goals/${id}`),
  submit: (id: string) => api.post(`/goals/${id}/submit`).then((r: any) => r.data.goal),
  approve: (id: string) => api.post(`/goals/${id}/approve`).then((r: any) => r.data.goal),
  reject: (id: string, comment: string) => api.post(`/goals/${id}/reject`, { comment }).then((r: any) => r.data.goal),
  lock: (id: string) => api.post(`/goals/${id}/lock`).then((r: any) => r.data.goal),
  unlock: (id: string) => api.post(`/goals/${id}/unlock`).then((r: any) => r.data.goal),
  importPortfolio: (goals: GoalAutopilotGoal[]) =>
    api.post('/goals/portfolio/import', { goals }).then((r: any) => r.data.goals as Goal[]),
  pushShared: (data: { userIds: string[]; [key: string]: any }) => {
    const { userIds, ...rest } = data;
    return api.post('/goals/shared', { ...rest, employeeIds: userIds }).then((r: any) => r.data.goals);
  },
  getDependencyGraph: () => api.get('/goals/dependency-graph').then((r: any) => r.data),
};

// ─── Check-ins ────────────────────────────────────────────────────────────────
export const checkinsService = {
  create: (data: Partial<CheckIn>) => api.post('/checkins', data).then((r: any) => r.data.checkIn),
  addManagerComment: (id: string, comment: string) => api.put(`/checkins/${id}`, { managerComment: comment }).then((r: any) => r.data.checkIn),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsService = {
  getAchievement: () => api.get('/reports/achievement').then((r: any) => r.data.report || []),
  getCompletionDashboard: () => api.get('/reports/completion').then((r: any) => r.data.report || []),
  getDepartmentSummary: () => api.get('/reports/completion').then((r: any) => r.data.report || []),
  getLeaderboards: () => api.get('/reports/leaderboards').then((r: any) => r.data as { leaderboard: LeaderboardRow[]; engagementScore: number; alertFlags: string[] }),
  exportDossier: (userId: string) => api.get(`/reports/dossier/${userId}`, { responseType: 'blob' }).then((r: any) => r.data as Blob),
  exportAchievement: (format: 'csv' | 'excel') =>
    api.get(`/reports/achievement/export`, { params: { format }, responseType: 'blob' }).then((r: any) => r.data as Blob),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsService = {
  getAll: () => api.get('/notifications').then((r: any) => r.data.notifications as Notification[] || []),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditService = {
  getAll: (params?: Record<string, string>) => api.get('/audit', { params }).then((r: any) => r.data as AuditLog[]),
  getForGoal: (goalId: string) => api.get(`/audit/goal/${goalId}`).then((r: any) => r.data as AuditLog[]),
};

// ─── Escalations ──────────────────────────────────────────────────────────────
export const escalationsService = {
  getRules: () => api.get('/escalations/rules').then((r: any) => r.data as EscalationRule[]),
  createRule: (data: Partial<EscalationRule>) => api.post('/escalations/rules', data).then((r: any) => r.data),
  updateRule: (id: string, data: Partial<EscalationRule>) => api.put(`/escalations/rules/${id}`, data).then((r: any) => r.data),
  getLog: () => api.get('/escalations/log').then((r: any) => r.data),
  triggerManual: () => api.post('/escalations/trigger-manual').then((r: any) => r.data),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiService = {
  smartRewrite: (thrustArea: string, title: string, description: string) =>
    api.post('/ai/smart-rewrite', { thrustArea, title, description }).then((r: any) => r.data as SmartRewriteResponse),
  goalAutopilot: (jobTitle: string, department?: string) =>
    api.post('/ai/goal-autopilot', { jobTitle, department }).then((r: any) => r.data as { goals: GoalAutopilotGoal[] }),
  conflictCheck: (goals: Partial<Goal>[]) =>
    api.post('/ai/conflict-check', { goals }).then((r: any) => r.data as ConflictCheckResponse),
  suggestWeightage: (goals: Partial<Goal>[], thrustAreas: string[]) =>
    api.post('/ai/suggest-weightage', { goals, thrustAreas }).then((r: any) => r.data),
  conversationalCheckin: (goalId: string, quarter: string, messages: any[]) =>
    api.post('/ai/conversational-checkin', { goalId, quarter, messages }).then((r: any) => r.data),
  goalSummary: (employeeId: string) =>
    api.post('/ai/goal-summary', { employeeId }).then((r: any) => r.data as { summary: string }),
  performanceReview: (employeeId: string) =>
    api.post('/ai/performance-review', { employeeId }).then((r: any) => r.data as PerformanceReviewDraftResponse),
  getCalibrationCopilot: (managerId?: string) =>
    api.get('/ai/calibration-copilot', { params: managerId ? { managerId } : {} }).then((r: any) => r.data as CalibrationCopilotReport),
  getNarrativeIntelligence: (managerId?: string) =>
    api.get('/ai/narrative-intelligence', { params: managerId ? { managerId } : {} }).then((r: any) => r.data as NarrativeIntelligenceResponse),
};

// ─── ML ───────────────────────────────────────────────────────────────────────
export const mlService = {
  predictAchievement: (userId: string, cycleId: string) =>
    api.post('/ml/predict-achievement', { employeeId: userId, cycleId }).then((r: any) => r.data as PredictionResult[]),
  goalQuality: (title: string, description: string) =>
    api.post('/ml/goal-quality', { title, description }).then((r: any) => r.data),
  getAnomalies: () => api.get('/ml/anomalies').then((r: any) => r.data as AnomalyResult[]),
  suggestThrustArea: (title: string, description: string) =>
    api.post('/ml/suggest-thrust-area', { title, description }).then((r: any) => r.data as ThrustAreaSuggestion),
  getSentimentTrends: (managerId: string) =>
    api.get('/ml/sentiment-trends', { params: { managerId } }).then((r: any) => r.data),
  getTeamSentiment: (managerId?: string) =>
    api.get('/ml/team-sentiment', { params: managerId ? { managerId } : {} }).then((r: any) => r.data as TeamSentimentSummary),
  getFlightRisk: (managerId?: string) =>
    api.get('/ml/flight-risk', { params: managerId ? { managerId } : {} }).then((r: any) => r.data as FlightRiskReport),
  runWhatIf: (goalId: string, newWeightage: number) =>
    api.post('/ml/what-if', { goalId, newWeightage }).then((r: any) => r.data as WhatIfSimulationResponse),
};

export const kudosService = {
  getAll: (receiverId?: string) => api.get('/kudos', { params: receiverId ? { receiverId } : {} }).then((r: any) => r.data.kudos as Kudos[]),
  create: (data: { receiverId: string; goalId?: string; badgeType: Kudos['badgeType']; note: string }) =>
    api.post('/kudos', data).then((r: any) => r.data.kudos as Kudos),
};

export const delegationsService = {
  getAll: () => api.get('/delegations').then((r: any) => r.data.delegations as ApprovalDelegation[]),
  create: (data: { delegatorManagerId?: string; delegateManagerId: string; startsAt: string; endsAt: string; reason: string }) =>
    api.post('/delegations', data).then((r: any) => r.data.delegation as ApprovalDelegation),
};

export const integrationsService = {
  getTeamsCards: (managerId: string) => api.get(`/integrations/teams/cards/${managerId}`).then((r: any) => r.data.cards as Notification[]),
  submitTeamsAction: (decision: 'approve' | 'reject', token: string, comment?: string) =>
    api.post(`/integrations/teams/actions/${decision}`, { token, comment }).then((r: any) => r.data.goal as Goal),
  simulateExternalSync: (
    provider: 'jira' | 'github',
    payload: { goalId: string; incrementBy?: number; actualValue?: number; quarter?: string; status?: string; eventTitle?: string; note?: string }
  ) => api.post(`/integrations/sync/${provider}`, payload).then((r: any) => r.data as ExternalSyncResult),
  chatopsCommand: (platform: 'teams' | 'slack', command: string, quarter?: string) =>
    api.post('/integrations/chatops/command', { platform, command, quarter }).then((r: any) => r.data as ChatOpsResponse),
  getWebhooks: () => api.get('/integrations/webhooks').then((r: any) => r.data.endpoints as WebhookEndpoint[]),
  createWebhook: (payload: { name: string; url: string; secret: string; subscribedEvents: string[]; isActive?: boolean }) =>
    api.post('/integrations/webhooks', payload).then((r: any) => r.data.endpoint as WebhookEndpoint),
  testWebhook: (id: string) => api.post(`/integrations/webhooks/${id}/test`).then((r: any) => r.data),
  getWebhookDeliveries: () => api.get('/integrations/webhook-deliveries').then((r: any) => r.data.deliveries as WebhookDelivery[]),
  getFeatureFlags: () => api.get('/integrations/feature-flags').then((r: any) => r.data.flags as FeatureFlag[]),
  updateFeatureFlag: (key: string, enabled: boolean, description?: string, metadata?: Record<string, unknown>) =>
    api.put(`/integrations/feature-flags/${key}`, { enabled, description, metadata }).then((r: any) => r.data.flag as FeatureFlag),
  getPlatformOverview: () => api.get('/integrations/platform').then((r: any) => r.data as PlatformOverviewResponse),
  getDomainEvents: (take = 50) => api.get('/integrations/events', { params: { take } }).then((r: any) => r.data.events as DomainEvent[]),
};
