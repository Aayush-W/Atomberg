"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.createUser = exports.listManagers = exports.getTeam = exports.getUser = exports.listUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const auth_1 = require("../utils/auth");
const tenant_1 = require("../utils/tenant");
function assertAuthenticated(req) {
    if (!req.user) {
        throw (0, errors_1.unauthorized)();
    }
    return req.user;
}
async function assertCanReadUser(req, user) {
    const authUser = assertAuthenticated(req);
    if (authUser.role === client_1.Role.ADMIN || authUser.id === user.id || user.managerId === authUser.id) {
        return;
    }
    throw (0, errors_1.forbidden)('You can only view users in your reporting scope');
}
function limitUpdateForNonAdmin(req, targetUserId, input) {
    const authUser = assertAuthenticated(req);
    if (authUser.role === client_1.Role.ADMIN) {
        return input;
    }
    if (authUser.id !== targetUserId) {
        throw (0, errors_1.forbidden)('Only admins can update other users');
    }
    const allowedKeys = ['name', 'password', 'jobTitle'];
    const blockedKeys = Object.keys(input).filter((key) => !allowedKeys.includes(key));
    if (blockedKeys.length > 0) {
        throw (0, errors_1.forbidden)('Only admins can update email, role, department, or manager');
    }
    return input;
}
function sanitizeUsers(users) {
    return users.map((user) => (0, auth_1.toPublicUser)(user));
}
exports.listUsers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const authUser = assertAuthenticated(_req);
    const users = await prisma_1.prisma.user.findMany({
        where: (0, tenant_1.tenantUserScope)(authUser),
        include: { tenant: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }]
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.getUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = assertAuthenticated(req);
    const user = await prisma_1.prisma.user.findFirst({
        where: (0, tenant_1.tenantUserScope)(authUser, { id: req.params.id }),
        include: { tenant: true }
    });
    if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
    }
    await assertCanReadUser(req, user);
    res.json({ user: (0, auth_1.toPublicUser)(user) });
});
exports.getTeam = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = assertAuthenticated(req);
    if (authUser.role !== client_1.Role.ADMIN && authUser.id !== req.params.managerId) {
        throw (0, errors_1.forbidden)('Managers can only view their own team');
    }
    const users = await prisma_1.prisma.user.findMany({
        where: (0, tenant_1.tenantUserScope)(authUser, { managerId: req.params.managerId }),
        include: { tenant: true },
        orderBy: { name: 'asc' }
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.listManagers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = assertAuthenticated(req);
    const users = await prisma_1.prisma.user.findMany({
        where: (0, tenant_1.tenantUserScope)(authUser, { role: client_1.Role.MANAGER }),
        include: { tenant: true },
        orderBy: { name: 'asc' }
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.createUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = assertAuthenticated(req);
    const hashedPassword = await bcrypt_1.default.hash(req.body.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            tenantId: authUser.tenantId,
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            role: req.body.role,
            department: req.body.department,
            jobTitle: req.body.jobTitle,
            managerId: req.body.managerId ?? null
        },
        include: { tenant: true }
    });
    res.status(201).json({ user: (0, auth_1.toPublicUser)(user) });
});
exports.updateUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authUser = assertAuthenticated(req);
    const input = limitUpdateForNonAdmin(req, req.params.id, req.body);
    const existing = await prisma_1.prisma.user.findFirst({
        where: (0, tenant_1.tenantUserScope)(authUser, { id: req.params.id })
    });
    if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
    }
    const data = {};
    if (input.name !== undefined)
        data.name = input.name;
    if (input.email !== undefined)
        data.email = input.email;
    if (input.role !== undefined)
        data.role = input.role;
    if (input.department !== undefined)
        data.department = input.department;
    if (input.jobTitle !== undefined)
        data.jobTitle = input.jobTitle;
    if (input.managerId !== undefined)
        data.managerId = input.managerId;
    if (input.password !== undefined)
        data.password = await bcrypt_1.default.hash(input.password, 10);
    const user = await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data,
        include: { tenant: true }
    });
    res.json({ user: (0, auth_1.toPublicUser)(user) });
});
