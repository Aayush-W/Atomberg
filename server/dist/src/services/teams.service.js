"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignedDecisionToken = verifySignedDecisionToken;
exports.buildAdaptiveGoalApprovalCard = buildAdaptiveGoalApprovalCard;
const crypto_1 = __importDefault(require("crypto"));
const signingSecret = process.env.TEAMS_SIGNING_SECRET || process.env.JWT_SECRET || 'goalforge-demo-secret';
function signPayload(payload) {
    const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto_1.default.createHmac('sha256', signingSecret).update(base).digest('hex');
    return `${base}.${signature}`;
}
function verifySignedDecisionToken(token) {
    const [base, signature] = token.split('.');
    if (!base || !signature) {
        throw new Error('Invalid token');
    }
    const expected = crypto_1.default.createHmac('sha256', signingSecret).update(base).digest('hex');
    if (expected !== signature) {
        throw new Error('Invalid signature');
    }
    return JSON.parse(Buffer.from(base, 'base64url').toString('utf8'));
}
function buildAdaptiveGoalApprovalCard(goal, managerId) {
    const approveToken = signPayload({ goalId: goal.id, decision: 'approve', managerId });
    const rejectToken = signPayload({ goalId: goal.id, decision: 'reject', managerId });
    return {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
            {
                type: 'TextBlock',
                size: 'Large',
                weight: 'Bolder',
                text: `${goal.user.name} submitted Q goals for approval`
            },
            {
                type: 'FactSet',
                facts: [
                    { title: 'Employee', value: goal.user.name },
                    { title: 'Department', value: goal.user.department },
                    { title: 'Goal', value: goal.title },
                    { title: 'Weightage', value: `${goal.weightage}%` }
                ]
            },
            {
                type: 'TextBlock',
                wrap: true,
                spacing: 'Medium',
                text: goal.description
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Approve',
                data: { token: approveToken, decision: 'approve' }
            },
            {
                type: 'Action.Submit',
                title: 'Reject',
                data: { token: rejectToken, decision: 'reject' }
            }
        ]
    };
}
