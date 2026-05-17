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
    return users.map(auth_1.toPublicUser);
}
exports.listUsers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        orderBy: [{ role: 'asc' }, { name: 'asc' }]
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.getUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.params.id } });
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
        where: { managerId: req.params.managerId },
        orderBy: { name: 'asc' }
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.listManagers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        where: { role: client_1.Role.MANAGER },
        orderBy: { name: 'asc' }
    });
    res.json({ users: sanitizeUsers(users) });
});
exports.createUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const hashedPassword = await bcrypt_1.default.hash(req.body.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            role: req.body.role,
            department: req.body.department,
            jobTitle: req.body.jobTitle,
            managerId: req.body.managerId ?? null
        }
    });
    res.status(201).json({ user: (0, auth_1.toPublicUser)(user) });
});
exports.updateUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = limitUpdateForNonAdmin(req, req.params.id, req.body);
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
        data
    });
    res.json({ user: (0, auth_1.toPublicUser)(user) });
});
