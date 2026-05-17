"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCycleStatus = exports.updateCycle = exports.createCycle = exports.getActiveCycle = exports.listCycles = void 0;
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const cycleRules_service_1 = require("../services/cycleRules.service");
exports.listCycles = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const cycles = await prisma_1.prisma.cycle.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ cycles });
});
exports.getActiveCycle = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const cycle = await prisma_1.prisma.cycle.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' }
    });
    res.json({ cycle });
});
exports.createCycle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.body.isActive ?? true) {
        await prisma_1.prisma.cycle.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    const cycle = await prisma_1.prisma.cycle.create({
        data: {
            ...req.body,
            isActive: req.body.isActive ?? true,
            bypassWindow: req.body.bypassWindow ?? false
        }
    });
    res.status(201).json({ cycle });
});
exports.updateCycle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.body.isActive === true) {
        await prisma_1.prisma.cycle.updateMany({
            where: { isActive: true, NOT: { id: req.params.id } },
            data: { isActive: false }
        });
    }
    const cycle = await prisma_1.prisma.cycle.update({
        where: { id: req.params.id },
        data: req.body
    });
    res.json({ cycle });
});
exports.getCycleStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const cycle = await prisma_1.prisma.cycle.findUnique({ where: { id: req.params.id } });
    if (!cycle) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
        return;
    }
    res.json({ cycleId: cycle.id, status: (0, cycleRules_service_1.cycleStatus)(cycle) });
});
