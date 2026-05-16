import { api } from './api';
import type {
  AuthResponse,
  User,
  Goal,
  Cycle,
  CheckIn,
  Notification,
  EscalationRule,
  AchievementReportRow,
  CompletionDashboardRow,
  SmartRewriteResponse,
  ConflictCheckResponse,
  GoalQualityResponse,
  AchievementPrediction,
  AnomalyResult,
  ThrustAreaSuggestion,
  CycleWindowStatus,
} from '@/types';

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

// ─── USERS ───────────────────────────────────────────────────────────────────

export const usersService = {
  getAll: () => api.get<User[]>('/users').then((r) => r.data),
  getById: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),
  getTeam: (managerId: string) => api.get<User[]>(`/users/team/${managerId}`).then((r) => r.data),
  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),
};

// ─── CYCLES ──────────────────────────────────────────────────────────────────

export const cyclesService = {
  getAll: () => api.get<Cycle[]>('/cycles').then((r) => r.data),
  getActive: () => api.get<Cycle>('/cycles/active').then((r) => r.data),
  getStatus: (id: string) =>
    api.get<CycleWindowStatus>(`/cycles/${id}/status`).then((r) => r.data),
  create: (data: Partial<Cycle>) => api.post<Cycle>('/cycles', data).then((r) => r.data),
  update: (id: string, data: Partial<Cycle>) =>
    api.put<Cycle>(`/cycles/${id}`, data).then((r) => r.data),
};

// ─── GOALS ───────────────────────────────────────────────────────────────────

export const goalsService = {
  getMine: () => api.get<Goal[]>('/goals').then((r) => r.data),
  getTeam: () => api.get<Goal[]>('/goals/team').then((r) => r.data),
  getAll: () => api.get<Goal[]>('/goals/all').then((r) => r.data),
  getById: (id: string) => api.get<Goal>(`/goals/${id}`).then((r) => r.data),
  create: (data: Partial<Goal>) => api.post<Goal>('/goals', data).then((r) => r.data),
  update: (id: string, data: Partial<Goal>) =>
    api.put<Goal>(`/goals/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  submit: (id: string) => api.post<Goal>(`/goals/${id}/submit`).then((r) => r.data),
  approve: (id: string, comment?: string) =>
    api.post<Goal>(`/goals/${id}/approve`, { comment }).then((r) => r.data),
  reject: (id: string, comment: string) =>
    api.post<Goal>(`/goals/${id}/reject`, { comment }).then((r) => r.data),
  unlock: (id: string) => api.post<Goal>(`/goals/${id}/unlock`).then((r) => r.data),
  pushShared: (data: {
    thrustArea: string; title: string; description: string;
    uomType: string; target: number; userIds: string[];
  }) => api.post('/goals/shared', data).then((r) => r.data),
  getDependencyGraph: () =>
    api.get('/goals/dependency-graph').then((r) => r.data),
  addDependency: (id: string, requiredGoalId: string) =>
    api.post(`/goals/${id}/dependency`, { requiredGoalId }),
  getAudit: (id: string) => api.get(`/goals/${id}/audit`).then((r) => r.data),
};

// ─── CHECK-INS ───────────────────────────────────────────────────────────────

export const checkinsService = {
  getForGoal: (goalId: string) =>
    api.get<CheckIn[]>(`/checkins/goal/${goalId}`).then((r) => r.data),
  create: (data: Partial<CheckIn>) => api.post<CheckIn>('/checkins', data).then((r) => r.data),
  update: (id: string, data: Partial<CheckIn>) =>
    api.put<CheckIn>(`/checkins/${id}`, data).then((r) => r.data),
  addManagerComment: (id: string, comment: string) =>
    api.post(`/checkins/${id}/manager-comment`, { comment }).then((r) => r.data),
  getTeam: () => api.get<CheckIn[]>('/checkins/team').then((r) => r.data),
  getCompletionStatus: () =>
    api.get('/checkins/completion-status').then((r) => r.data),
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const reportsService = {
  getAchievement: (params?: Record<string, string>) =>
    api.get<AchievementReportRow[]>('/reports/achievement', { params }).then((r) => r.data),
  exportAchievement: (format: 'csv' | 'excel') =>
    api.get(`/reports/achievement/export`, {
      params: { format },
      responseType: 'blob',
    }).then((r) => r.data),
  getCompletionDashboard: () =>
    api.get<CompletionDashboardRow[]>('/reports/completion-dashboard').then((r) => r.data),
  getManagerEffectiveness: () =>
    api.get('/reports/manager-effectiveness').then((r) => r.data),
  getQoQTrends: () => api.get('/reports/qoq-trends').then((r) => r.data),
  getGoalDistribution: () => api.get('/reports/goal-distribution').then((r) => r.data),
};

// ─── AUDIT ───────────────────────────────────────────────────────────────────

export const auditService = {
  getAll: (params?: Record<string, string>) =>
    api.get('/audit', { params }).then((r) => r.data),
  getForGoal: (goalId: string) =>
    api.get(`/audit/goal/${goalId}`).then((r) => r.data),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notificationsService = {
  getAll: () => api.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};

// ─── ESCALATIONS ─────────────────────────────────────────────────────────────

export const escalationsService = {
  getRules: () => api.get<EscalationRule[]>('/escalations/rules').then((r) => r.data),
  createRule: (data: Partial<EscalationRule>) =>
    api.post<EscalationRule>('/escalations/rules', data).then((r) => r.data),
  updateRule: (id: string, data: Partial<EscalationRule>) =>
    api.put<EscalationRule>(`/escalations/rules/${id}`, data).then((r) => r.data),
  getLog: () => api.get('/escalations/log').then((r) => r.data),
  triggerManual: () => api.post('/escalations/trigger-manual').then((r) => r.data),
};

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiService = {
  smartRewrite: (thrustArea: string, title: string, description: string) =>
    api.post<SmartRewriteResponse>('/ai/smart-rewrite', { thrustArea, title, description })
      .then((r) => r.data),
  conflictCheck: (goals: Goal[]) =>
    api.post<ConflictCheckResponse>('/ai/conflict-check', { goals }).then((r) => r.data),
  suggestWeightage: (goals: Goal[], thrustAreas: string[]) =>
    api.post('/ai/suggest-weightage', { goals, thrustAreas }).then((r) => r.data),
  conversationalCheckin: (goalId: string, quarter: string, messages: unknown[]) =>
    api.post('/ai/conversational-checkin', { goalId, quarter, messages }).then((r) => r.data),
  goalSummary: (employeeId: string) =>
    api.post('/ai/goal-summary', { employeeId }).then((r) => r.data),
};

// ─── ML ──────────────────────────────────────────────────────────────────────

export const mlService = {
  predictAchievement: (employeeId: string, cycleId: string) =>
    api.post<AchievementPrediction[]>('/ml/predict-achievement', { employeeId, cycleId })
      .then((r) => r.data),
  goalQuality: (title: string, description: string) =>
    api.post<GoalQualityResponse>('/ml/goal-quality', { title, description }).then((r) => r.data),
  getAnomalies: () => api.get<AnomalyResult[]>('/ml/anomalies').then((r) => r.data),
  suggestThrustArea: (title: string, description: string) =>
    api.post<ThrustAreaSuggestion>('/ml/suggest-thrust-area', { title, description })
      .then((r) => r.data),
  getSentimentTrends: (managerId: string) =>
    api.get(`/ml/sentiment-trends`, { params: { managerId } }).then((r) => r.data),
};
