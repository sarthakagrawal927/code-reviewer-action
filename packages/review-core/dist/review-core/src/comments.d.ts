import { ReviewFinding, ReviewScore } from '../../shared-types/src';
export declare const SUMMARY_COMMENT_MARKER = "<!-- ai-review-lite-summary -->";
export declare function buildSummaryComment(findings: ReviewFinding[], score: ReviewScore, options: {
    reviewTone: string;
    maxFindingsPerSeverity?: number;
}): string;
export declare function buildInlineFindingComment(finding: ReviewFinding, index: number, total: number): string;
