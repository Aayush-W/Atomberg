"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldMaskGoalForViewer = shouldMaskGoalForViewer;
exports.maskGoalContent = maskGoalContent;
exports.buildSimplePdf = buildSimplePdf;
const client_1 = require("@prisma/client");
function shouldMaskGoalForViewer(goal, viewer) {
    return viewer.role === client_1.Role.ADMIN && goal.sensitivity !== client_1.GoalSensitivity.NORMAL;
}
function maskGoalContent(goal, viewer) {
    if (!shouldMaskGoalForViewer(goal, viewer)) {
        return goal;
    }
    const suffix = goal.sensitivity === client_1.GoalSensitivity.TECHNICAL ? 'Technical goal' : 'Financial goal';
    return {
        ...goal,
        title: `${suffix} (masked)`,
        description: 'Sensitive goal content is masked for admin analytics views.'
    };
}
function escapePdfText(input) {
    return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function buildSimplePdf(lines) {
    const safeLines = lines.map((line) => escapePdfText(line)).slice(0, 45);
    const textCommands = safeLines
        .map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 16} Td (${line}) Tj ET`)
        .join('\n');
    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
        `4 0 obj << /Length ${Buffer.byteLength(textCommands, 'utf8')} >> stream\n${textCommands}\nendstream endobj`,
        '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
    ];
    let body = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
        offsets.push(Buffer.byteLength(body, 'utf8'));
        body += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(body, 'utf8');
    body += `xref\n0 ${objects.length + 1}\n`;
    body += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
        body += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(body, 'utf8');
}
