"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCycleStatus = exports.updateCycle = exports.createCycle = exports.getActiveCycle = exports.listCycles = void 0;
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const _helpers_1 = require("./_helpers");
const cycleRules_service_1 = require("../services/cycleRules.service");
exports.listCycles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const cycles = await prisma_1.prisma.cycle.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { startDate: 'desc' }
    });
    res.json({ cycles });
});
exports.getActiveCycle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const cycle = await prisma_1.prisma.cycle.findFirst({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { startDate: 'desc' }
    });
    res.json({ cycle });
});
exports.createCycle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (req.body.isActive ?? true) {
        await prisma_1.prisma.cycle.updateMany({ where: { tenantId: user.tenantId, isActive: true }, data: { isActive: false } });
    }
    const cycle = await prisma_1.prisma.cycle.create({
        data: {
            tenantId: user.tenantId,
            ...req.body,
            isActive: req.body.isActive ?? true,
            bypassWindow: req.body.bypassWindow ?? false
        }
    });
    res.status(201).json({ cycle });
});
exports.updateCycle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (req.body.isActive === true) {
        await prisma_1.prisma.cycle.updateMany({
            where: { tenantId: user.tenantId, isActive: true, NOT: { id: req.params.id } },
            data: { isActive: false }
        });
    }
    const cycle = await prisma_1.prisma.cycle.updateMany({
        where: { id: req.params.id, tenantId: user.tenantId },
        data: req.body
    });
    if (cycle.count === 0) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
        return;
    }
    const updatedCycle = await prisma_1.prisma.cycle.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } });
    res.json({ cycle: updatedCycle });
});
exports.getCycleStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const cycle = await prisma_1.prisma.cycle.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } });
    if (!cycle) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
        return;
    }
    res.json({ cycleId: cycle.id, status: (0, cycleRules_service_1.cycleStatus)(cycle) });
});
