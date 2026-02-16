"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUMMARY_COMMENT_MARKER = void 0;
exports.buildSummaryComment = buildSummaryComment;
exports.buildInlineFindingComment = buildInlineFindingComment;
const findings_1 = require("./findings");
const ORDERED_SEVERITIES = ['critical', 'high', 'medium', 'low'];
exports.SUMMARY_COMMENT_MARKER = '<!-- ai-review-lite-summary -->';
function formatFindingLine(finding) {
    const location = finding.filePath
        ? ` (${finding.filePath}${finding.line ? `:${finding.line}` : ''})`
        : '';
    return `- [${finding.severity.toUpperCase()}] ${finding.title}${location} - ${finding.summary}`;
}
function buildSummaryComment(findings, score, options) {
    const sorted = (0, findings_1.sortBySeverity)(findings);
    const maxPerSeverity = options.maxFindingsPerSeverity ?? 2;
    const grouped = new Map();
    const totals = new Map();
    for (const severity of ORDERED_SEVERITIES) {
        grouped.set(severity, []);
        totals.set(severity, 0);
    }
    for (const finding of sorted) {
        totals.set(finding.severity, (totals.get(finding.severity) ?? 0) + 1);
        const bucket = grouped.get(finding.severity);
        if (!bucket) {
            continue;
        }
        if (bucket.length < maxPerSeverity) {
            bucket.push(finding);
        }
    }
    const sections = [];
    let shownCount = 0;
    for (const severity of ORDERED_SEVERITIES) {
        const severityFindings = grouped.get(severity) ?? [];
        if (severityFindings.length === 0) {
            continue;
        }
        shownCount += severityFindings.length;
        const totalForSeverity = totals.get(severity) ?? severityFindings.length;
        sections.push(`### ${severity.toUpperCase()} (${severityFindings.length}/${totalForSeverity})`);
        sections.push(...severityFindings.map(formatFindingLine));
        sections.push('');
    }
    const hiddenCount = Math.max(0, findings.length - shownCount);
    const body = sections.length > 0 ? sections.join('\n') : '_No significant findings from AI review._';
    return [
        exports.SUMMARY_COMMENT_MARKER,
        '## AI Review Lite',
        '',
        `Scores: Q **${score.quality}** | R **${score.risk}** | V **${score.value}** | C **${score.composite}**`,
        `Findings: **${findings.length}** total`,
        '',
        hiddenCount > 0 ? `_Showing top ${shownCount}; ${hiddenCount} additional finding(s) omitted for brevity._` : '',
        body,
        '',
        `score_footer: quality=${score.quality};risk=${score.risk};value=${score.value};composite=${score.composite}`
    ].join('\n');
}
function buildInlineFindingComment(finding, index, total) {
    return [
        `AI finding ${index}/${total}: **[${finding.severity.toUpperCase()}] ${finding.title}**`,
        finding.summary,
    ].join('\n');
}
