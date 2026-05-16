"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentUser = currentUser;
const errors_1 = require("../utils/errors");
function currentUser(req) {
    if (!req.user)
        throw (0, errors_1.unauthorized)();
    return req.user;
}
