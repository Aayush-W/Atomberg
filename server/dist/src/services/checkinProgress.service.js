"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProgress = computeProgress;
exports.deriveCheckInStatus = deriveCheckInStatus;
exports.quarterFromDate = quarterFromDate;
exports.isAfterHours = isAfterHours;
const client_1 = require("@prisma/client");
function computeProgress(goal, input) {
    const uom = goal.uomType;
    const actual = typeof input.actualValue === 'number' ? input.actualValue : 0;
    if (uom === client_1.UoMType.MAX) {
        if (!goal.target || goal.target === 0 || actual === 0)
            return actual === 0 ? 100 : 0;
        return Math.round((goal.target / actual) * 100);
    }
    if (uom === client_1.UoMType.MIN) {
        if (!goal.target || goal.target === 0)
            return 0;
        return Math.round((actual / goal.target) * 100);
    }
    if (uom === client_1.UoMType.TIMELINE) {
        const completion = input.completionDate;
        if (!goal.targetDate || !completion)
            return 0;
        const diff = Math.floor((goal.targetDate.getTime() - new Date(completion).getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0)
            return 100;
        return Math.max(0, 100 + diff * 2);
    }
    if (uom === client_1.UoMType.ZERO) {
        return actual === 0 ? 100 : 0;
    }
    return 0;
}
function deriveCheckInStatus(progressScore) {
    if (progressScore >= 100)
        return client_1.CheckInStatus.COMPLETED;
    if (progressScore <= 0)
        return client_1.CheckInStatus.NOT_STARTED;
    return client_1.CheckInStatus.ON_TRACK;
}
function quarterFromDate(cycleStartDate, date = new Date()) {
    const eventDate = date instanceof Date ? date : new Date(date);
    if (!cycleStartDate) {
        const month = eventDate.getUTCMonth();
        if (month <= 2)
            return client_1.Quarter.Q1;
        if (month <= 5)
            return client_1.Quarter.Q2;
        if (month <= 8)
            return client_1.Quarter.Q3;
        return client_1.Quarter.Q4;
    }
    const start = cycleStartDate instanceof Date ? cycleStartDate : new Date(cycleStartDate);
    const deltaMonths = (eventDate.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (eventDate.getUTCMonth() - start.getUTCMonth());
    const normalized = ((deltaMonths % 12) + 12) % 12;
    if (normalized <= 2)
        return client_1.Quarter.Q1;
    if (normalized <= 5)
        return client_1.Quarter.Q2;
    if (normalized <= 8)
        return client_1.Quarter.Q3;
    return client_1.Quarter.Q4;
}
function isAfterHours(timestamp) {
    const value = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const hour = value.getHours();
    return hour >= 21 || hour < 7;
}
