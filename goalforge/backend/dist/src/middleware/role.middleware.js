"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const errors_1 = require("../utils/errors");
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next((0, errors_1.unauthorized)());
            return;
        }
        if (!roles.includes(req.user.role)) {
            next((0, errors_1.forbidden)(`Requires one of these roles: ${roles.join(', ')}`));
            return;
        }
        next();
    };
}
