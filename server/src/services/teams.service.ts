import crypto from 'crypto';
import { Goal, User } from '@prisma/client';

const signingSecret = process.env.TEAMS_SIGNING_SECRET || process.env.JWT_SECRET || 'goalforge-demo-secret';

type GoalWithUser = Goal & {
  user: Pick<User, 'id' | 'name' | 'email' | 'department' | 'managerId'>;
};

function signPayload(payload: Record<string, string>) {
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', signingSecret).update(base).digest('hex');
  return `${base}.${signature}`;
}

export function verifySignedDecisionToken(token: string) {
  const [base, signature] = token.split('.');
  if (!base || !signature) {
    throw new Error('Invalid token');
  }
  const expected = crypto.createHmac('sha256', signingSecret).update(base).digest('hex');
  if (expected !== signature) {
    throw new Error('Invalid signature');
  }
  return JSON.parse(Buffer.from(base, 'base64url').toString('utf8')) as {
    goalId: string;
    decision: 'approve' | 'reject';
    managerId: string;
  };
}

export function buildAdaptiveGoalApprovalCard(goal: GoalWithUser, managerId: string) {
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
