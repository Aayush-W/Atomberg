"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cyclesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const cyclesController = __importStar(require("../controllers/cycles.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const cycle_validators_1 = require("../validators/cycle.validators");
exports.cyclesRouter = (0, express_1.Router)();
exports.cyclesRouter.use(auth_middleware_1.requireAuth);
exports.cyclesRouter.get('/', cyclesController.listCycles);
exports.cyclesRouter.get('/active', cyclesController.getActiveCycle);
exports.cyclesRouter.post('/', (0, role_middleware_1.requireRole)(client_1.Role.ADMIN), (0, validate_middleware_1.validate)(cycle_validators_1.createCycleSchema), cyclesController.createCycle);
exports.cyclesRouter.put('/:id', (0, role_middleware_1.requireRole)(client_1.Role.ADMIN), (0, validate_middleware_1.validate)(cycle_validators_1.cycleIdParamSchema, 'params'), (0, validate_middleware_1.validate)(cycle_validators_1.updateCycleSchema), cyclesController.updateCycle);
exports.cyclesRouter.get('/:id/status', (0, validate_middleware_1.validate)(cycle_validators_1.cycleIdParamSchema, 'params'), cyclesController.getCycleStatus);
