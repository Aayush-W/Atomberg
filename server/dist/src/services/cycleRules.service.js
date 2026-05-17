"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quarterWindowDays = void 0;
exports.addDays = addDays;
exports.isWindowOpen = isWindowOpen;
exports.cycleStatus = cycleStatus;
exports.quarterWindowDays = 21;
function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function isWindowOpen(openDate, closeDate, bypassWindow, now = new Date()) {
    return bypassWindow || (now >= openDate && now <= closeDate);
}
function cycleStatus(cycle) {
    const checkIns = {
        Q1: {
            opensAt: cycle.q1Open,
            closesAt: addDays(cycle.q1Open, exports.quarterWindowDays),
            isOpen: isWindowOpen(cycle.q1Open, addDays(cycle.q1Open, exports.quarterWindowDays), cycle.bypassWindow)
        },
        Q2: {
            opensAt: cycle.q2Open,
            closesAt: addDays(cycle.q2Open, exports.quarterWindowDays),
            isOpen: isWindowOpen(cycle.q2Open, addDays(cycle.q2Open, exports.quarterWindowDays), cycle.bypassWindow)
        },
        Q3: {
            opensAt: cycle.q3Open,
            closesAt: addDays(cycle.q3Open, exports.quarterWindowDays),
            isOpen: isWindowOpen(cycle.q3Open, addDays(cycle.q3Open, exports.quarterWindowDays), cycle.bypassWindow)
        },
        Q4: {
            opensAt: cycle.q4Open,
            closesAt: cycle.endDate,
            isOpen: isWindowOpen(cycle.q4Open, cycle.endDate, cycle.bypassWindow)
        }
    };
    const activeQuarter = (Object.entries(checkIns).find(([, value]) => value.isOpen)?.[0] ?? null);
    const now = new Date();
    const nextWindow = [...Object.values(checkIns)]
        .map((window) => window.opensAt)
        .find((date) => date > now) ?? null;
    const daysRemaining = activeQuarter != null
        ? Math.max(0, Math.ceil((checkIns[activeQuarter].closesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
    return {
        bypassWindow: cycle.bypassWindow,
        goalSetting: {
            opensAt: cycle.goalSettingOpen,
            closesAt: cycle.q1Open,
            isOpen: isWindowOpen(cycle.goalSettingOpen, cycle.q1Open, cycle.bypassWindow)
        },
        checkIns,
        activeQuarter,
        nextWindowDate: nextWindow?.toISOString() ?? null,
        daysRemaining
    };
}
