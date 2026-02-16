"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSeverity = parseSeverity;
exports.meetsSeverityThreshold = meetsSeverityThreshold;
exports.severityWeight = severityWeight;
exports.sortBySeverity = sortBySeverity;
exports.normalizeFindings = normalizeFindings;
exports.filterGroundedFindings = filterGroundedFindings;
const src_1 = require("../../shared-types/src");
const SEVERITY_RANK = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
};
const SPECULATIVE_PATTERN = /\b(might|maybe|perhaps|could|likely|seems|appears|consider)\b/i;
const COSMETIC_RENAME_PATTERN = /\b(rename|renaming|naming|wording|terminology|cosmetic|consistency)\b/i;
const DATA_MODEL_PATTERN = /\b(collection|table|schema|column|field|index|migration)\b/i;
function normalizePath(path) {
    return path.trim().replace(/^\.?\//, '');
}
function isLowOrMedium(finding) {
    return finding.severity === 'low' || finding.severity === 'medium';
}
function isLikelySpeculative(finding) {
    if (!isLowOrMedium(finding)) {
        return false;
    }
    const text = `${finding.title} ${finding.summary}`;
    return SPECULATIVE_PATTERN.test(text);
}
function isLikelyCosmeticRenameSuggestion(finding) {
    if (!isLowOrMedium(finding)) {
        return false;
    }
    const text = `${finding.title} ${finding.summary}`;
    return COSMETIC_RENAME_PATTERN.test(text) && DATA_MODEL_PATTERN.test(text);
}
function parseSeverity(value, fallback = 'medium') {
    const normalized = value.trim().toLowerCase();
    return src_1.REVIEW_SEVERITIES.includes(normalized)
        ? normalized
        : fallback;
}
function meetsSeverityThreshold(severity, threshold) {
    return SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold];
}
function severityWeight(severity) {
    switch (severity) {
        case 'critical':
            return 35;
        case 'high':
            return 20;
        case 'medium':
            return 10;
        case 'low':
            return 4;
        default:
            return 0;
    }
}
function sortBySeverity(findings) {
    return [...findings].sort((a, b) => {
        const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (severityDiff !== 0) {
            return severityDiff;
        }
        const confidenceA = typeof a.confidence === 'number' ? a.confidence : 0;
        const confidenceB = typeof b.confidence === 'number' ? b.confidence : 0;
        return confidenceB - confidenceA;
    });
}
function normalizeFindings(rawFindings) {
    const deduped = new Map();
    for (const raw of rawFindings) {
        const title = raw.title.trim();
        const summary = raw.summary.trim();
        if (!title || !summary) {
            continue;
        }
        const severity = src_1.REVIEW_SEVERITIES.includes(raw.severity) ? raw.severity : 'medium';
        const finding = {
            severity,
            title,
            summary,
            filePath: raw.filePath ? normalizePath(raw.filePath) : undefined,
            line: typeof raw.line === 'number' && Number.isInteger(raw.line) && raw.line > 0 ? raw.line : undefined,
            confidence: typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
                ? Math.max(0, Math.min(1, raw.confidence))
                : undefined
        };
        const key = [
            finding.severity,
            finding.title.toLowerCase(),
            finding.summary.toLowerCase(),
            finding.filePath?.toLowerCase() ?? '',
            finding.line ?? ''
        ].join('|');
        if (!deduped.has(key)) {
            deduped.set(key, finding);
        }
    }
    return sortBySeverity(Array.from(deduped.values()));
}
function filterGroundedFindings(findings, parsedDiff, options = {}) {
    const requireChangedLine = options.requireChangedLine ?? true;
    return findings.filter(finding => {
        if (isLikelySpeculative(finding) || isLikelyCosmeticRenameSuggestion(finding)) {
            return false;
        }
        if (!requireChangedLine) {
            return true;
        }
        if (!finding.filePath || !finding.line) {
            return false;
        }
        const path = normalizePath(finding.filePath);
        const sideMap = parsedDiff.lineSideIndex.get(path);
        return !!sideMap?.has(finding.line);
    });
}
