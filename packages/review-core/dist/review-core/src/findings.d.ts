import { ReviewFinding, ReviewSeverity } from '../../shared-types/src';
import { ParsedDiff } from './diff';
export declare function parseSeverity(value: string, fallback?: ReviewSeverity): ReviewSeverity;
export declare function meetsSeverityThreshold(severity: ReviewSeverity, threshold: ReviewSeverity): boolean;
export declare function hasBlockingFindings(findings: ReviewFinding[], threshold: ReviewSeverity): boolean;
export declare function severityWeight(severity: ReviewSeverity): number;
export declare function sortBySeverity(findings: ReviewFinding[]): ReviewFinding[];
export declare function normalizeFindings(rawFindings: ReviewFinding[]): ReviewFinding[];
export declare function filterGroundedFindings(findings: ReviewFinding[], parsedDiff: ParsedDiff, options?: {
    requireChangedLine?: boolean;
}): ReviewFinding[];
