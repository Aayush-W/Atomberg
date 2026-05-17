"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantScope = tenantScope;
exports.tenantUserScope = tenantUserScope;
exports.tenantGoalScope = tenantGoalScope;
exports.tenantCycleScope = tenantCycleScope;
exports.tenantAuditScope = tenantAuditScope;
const client_1 = require("@prisma/client");
function tenantScope(user) {
    return { tenantId: user.tenantId };
}
function tenantUserScope(user, extra) {
    return { tenantId: user.tenantId, ...(extra ?? {}) };
}
function tenantGoalScope(user) {
    if (user.role === client_1.Role.ADMIN) {
        return { tenantId: user.tenantId };
    }
    if (user.role === client_1.Role.MANAGER) {
        return {
            tenantId: user.tenantId,
            OR: [{ userId: user.id }, { user: { managerId: user.id, tenantId: user.tenantId } }]
        };
    }
    return { tenantId: user.tenantId, userId: user.id };
}
function tenantCycleScope(user, extra) {
    return { tenantId: user.tenantId, ...(extra ?? {}) };
}
function tenantAuditScope(user, extra) {
    return { tenantId: user.tenantId, ...(extra ?? {}) };
}
