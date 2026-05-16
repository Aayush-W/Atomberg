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
exports.goalsRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const goalsController = __importStar(require("../controllers/goals.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const goal_validators_1 = require("../validators/goal.validators");
exports.goalsRouter = (0, express_1.Router)();
exports.goalsRouter.use(auth_middleware_1.requireAuth);
exports.goalsRouter.get('/', goalsController.listOwnGoals);
exports.goalsRouter.get('/team', (0, role_middleware_1.requireRole)(client_1.Role.MANAGER, client_1.Role.ADMIN), goalsController.listTeamGoals);
exports.goalsRouter.get('/all', (0, role_middleware_1.requireRole)(client_1.Role.ADMIN), goalsController.listAllGoals);
exports.goalsRouter.post('/', (0, role_middleware_1.requireRole)(client_1.Role.EMPLOYEE), (0, validate_middleware_1.validate)(goal_validators_1.createGoalSchema), goalsController.createGoal);
exports.goalsRouter.post('/shared', (0, role_middleware_1.requireRole)(client_1.Role.MANAGER, client_1.Role.ADMIN), (0, validate_middleware_1.validate)(goal_validators_1.sharedGoalSchema), goalsController.createSharedGoal);
exports.goalsRouter.get('/dependency-graph', goalsController.getDependencyGraph);
exports.goalsRouter.get('/:id/audit', (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), goalsController.getGoalAudit);
exports.goalsRouter.put('/:id', (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), (0, validate_middleware_1.validate)(goal_validators_1.updateGoalSchema), goalsController.updateGoal);
exports.goalsRouter.delete('/:id', (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), goalsController.deleteGoal);
exports.goalsRouter.post('/:id/submit', (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), goalsController.submitGoal);
exports.goalsRouter.post('/:id/approve', (0, role_middleware_1.requireRole)(client_1.Role.MANAGER, client_1.Role.ADMIN), (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), (0, validate_middleware_1.validate)(goal_validators_1.approveGoalSchema), goalsController.approveGoal);
exports.goalsRouter.post('/:id/reject', (0, role_middleware_1.requireRole)(client_1.Role.MANAGER, client_1.Role.ADMIN), (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), (0, validate_middleware_1.validate)(goal_validators_1.rejectGoalSchema), goalsController.rejectGoal);
exports.goalsRouter.post('/:id/unlock', (0, role_middleware_1.requireRole)(client_1.Role.ADMIN), (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), goalsController.unlockGoal);
exports.goalsRouter.post('/:id/dependency', (0, validate_middleware_1.validate)(goal_validators_1.goalIdParamSchema, 'params'), (0, validate_middleware_1.validate)(goal_validators_1.dependencySchema), goalsController.addDependency);
