"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCycleStatus = exports.updateCycle = exports.createCycle = exports.getActiveCycle = exports.listCycles = void 0;
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const quarterWindowDays = 21;
function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function isWindowOpen(openDate, closeDate, bypassWindow, now = new Date()) {
    return bypassWindow || (now >= openDate && now <= closeDate);
}
function cycleStatus(cycle) {
    return {
        bypassWindow: cycle.bypassWindow,
        goalSetting: {
            opensAt: cycle.goalSettingOpen,
            closesAt: cycle.q1Open,
            isOpen: isWindowOpen(cycle.goalSettingOpen, cycle.q1Open, cycle.bypassWindow)
        },
        checkIns: {
            Q1: {
                opensAt: cycle.q1Open,
                closesAt: addDays(cycle.q1Open, quarterWindowDays),
                isOpen: isWindowOpen(cycle.q1Open, addDays(cycle.q1Open, quarterWindowDays), cycle.bypassWindow)
            },
            Q2: {
                opensAt: cycle.q2Open,
                closesAt: addDays(cycle.q2Open, quarterWindowDays),
                isOpen: isWindowOpen(cycle.q2Open, addDays(cycle.q2Open, quarterWindowDays), cycle.bypassWindow)
            },
            Q3: {
                opensAt: cycle.q3Open,
                closesAt: addDays(cycle.q3Open, quarterWindowDays),
                isOpen: isWindowOpen(cycle.q3Open, addDays(cycle.q3Open, quarterWindowDays), cycle.bypassWindow)
            },
            Q4: {
                opensAt: cycle.q4Open,
                closesAt: cycle.endDate,
                isOpen: isWindowOpen(cycle.q4Open, cycle.endDate, cycle.bypassWindow)
            }
        }
    };
}
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
    res.json({ cycleId: cycle.id, status: cycleStatus(cycle) });
});
