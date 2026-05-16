// Add missing services to the API layer
import { api } from './api';
import type {
  Goal, CheckIn, Cycle, User, Notification,
  SmartRewriteResponse, ConflictCheckResponse,
  ThrustAreaSuggestion, AnomalyResult, PredictionResult,
  EscalationRule, AuditLog,
} from '@/types';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r: any) => r.data),
  refresh: (token: string) => api.post('/auth/refresh', { refreshToken: token }).then((r: any) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r: any) => r.data as User),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersService = {
  getAll: () => api.get('/users').then((r: any) => r.data as User[]),
  getTeam: (managerId: string) => api.get(`/users/team/${managerId}`).then((r: any) => r.data as User[]),
  getById: (id: string) => api.get(`/users/${id}`).then((r: any) => r.data as User),
  create: (data: Partial<User> & { password?: string }) => api.post('/users', data).then((r: any) => r.data),
  update: (id: string, data: Partial<User>) => api.put(`/users/${id}`, data).then((r: any) => r.data),
};

// ─── Cycles ───────────────────────────────────────────────────────────────────
export const cyclesService = {
  getAll: () => api.get('/cycles').then((r: any) => r.data as Cycle[]),
  getActive: () => api.get('/cycles/active').then((r: any) => r.data as Cycle),
  getStatus: (id: string) => api.get(`/cycles/${id}/status`).then((r: any) => r.data),
  create: (data: Partial<Cycle>) => api.post('/cycles', data).then((r: any) => r.data),
  update: (id: string, data: Partial<Cycle>) => api.put(`/cycles/${id}`, data).then((r: any) => r.data),
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goalsService = {
  getMine: () => api.get('/goals/mine').then((r: any) => r.data as Goal[]),
  getTeam: () => api.get('/goals/team').then((r: any) => r.data as Goal[]),
  getAll: () => api.get('/goals/all').then((r: any) => r.data as Goal[]),
  getById: (id: string) => api.get(`/goals/${id}`).then((r: any) => r.data as Goal),
  create: (data: Partial<Goal>) => api.post('/goals', data).then((r: any) => r.data),
  update: (id: string, data: Partial<Goal>) => api.put(`/goals/${id}`, data).then((r: any) => r.data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  submit: (id: string) => api.post(`/goals/${id}/submit`).then((r: any) => r.data),
  approve: (id: string) => api.post(`/goals/${id}/approve`).then((r: any) => r.data),
  reject: (id: string, comment: string) => api.post(`/goals/${id}/reject`, { comment }).then((r: any) => r.data),
  lock: (id: string) => api.post(`/goals/${id}/lock`).then((r: any) => r.data),
  unlock: (id: string) => api.post(`/goals/${id}/unlock`).then((r: any) => r.data),
  pushShared: (data: any) => api.post('/goals/shared', data).then((r: any) => r.data),
  getDependencyGraph: () => api.get('/goals/dependency-graph').then((r: any) => r.data),
};

// ─── Check-ins ────────────────────────────────────────────────────────────────
export const checkinsService = {
  create: (data: Partial<CheckIn>) => api.post('/checkins', data).then((r: any) => r.data),
  getMine: () => api.get('/checkins/mine').then((r: any) => r.data as CheckIn[]),
  addManagerComment: (id: string, comment: string) => api.put(`/checkins/${id}/comment`, { comment }).then((r: any) => r.data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsService = {
  getAchievement: () => api.get('/reports/achievement').then((r: any) => r.data),
  getCompletionDashboard: () => api.get('/reports/completion-dashboard').then((r: any) => r.data),
  exportAchievement: (format: 'csv' | 'excel') =>
    api.get(`/reports/achievement/export`, { params: { format }, responseType: 'blob' }).then((r: any) => r.data as Blob),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsService = {
  getAll: () => api.get('/notifications').then((r: any) => r.data as Notification[]),
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
  conflictCheck: (goals: Partial<Goal>[]) =>
    api.post('/ai/conflict-check', { goals }).then((r: any) => r.data as ConflictCheckResponse),
  suggestWeightage: (goals: Partial<Goal>[], thrustAreas: string[]) =>
    api.post('/ai/suggest-weightage', { goals, thrustAreas }).then((r: any) => r.data),
  conversationalCheckin: (goalId: string, quarter: string, messages: any[]) =>
    api.post('/ai/conversational-checkin', { goalId, quarter, messages }).then((r: any) => r.data),
  goalSummary: (employeeId: string) =>
    api.post('/ai/goal-summary', { employeeId }).then((r: any) => r.data as { summary: string }),
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
};
