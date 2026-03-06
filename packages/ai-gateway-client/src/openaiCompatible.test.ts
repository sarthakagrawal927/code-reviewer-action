import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { _test } from './openaiCompatible';

const { normalizeBaseUrl, normalizeSeverity, truncateDiff, coerceFinding, buildPrompt } = _test;

// ---------------------------------------------------------------------------
// normalizeBaseUrl
// ---------------------------------------------------------------------------
describe('normalizeBaseUrl', () => {
  it('accepts a valid https URL', () => {
    const result = normalizeBaseUrl('https://api.example.com/v1');
    assert.equal(result, 'https://api.example.com/v1');
  });

  it('accepts a valid http URL', () => {
    const result = normalizeBaseUrl('http://localhost:8080/v1');
    assert.equal(result, 'http://localhost:8080/v1');
  });

  it('throws for empty string', () => {
    assert.throws(() => normalizeBaseUrl(''), /ai_base_url is required/);
  });

  it('throws for whitespace-only string', () => {
    assert.throws(() => normalizeBaseUrl('   '), /ai_base_url is required/);
  });

  it('throws for invalid protocol', () => {
    assert.throws(() => normalizeBaseUrl('ftp://example.com'), /Invalid ai_base_url protocol/);
  });

  it('strips trailing slash from path', () => {
    const result = normalizeBaseUrl('https://api.example.com/v1/');
    assert.ok(!result.endsWith('/v1/'), 'should not end with trailing slash on path');
    assert.ok(result.includes('api.example.com/v1'), 'should contain the path without trailing slash');
  });

  it('throws for completely invalid URL', () => {
    assert.throws(() => normalizeBaseUrl('not-a-url'), /Invalid ai_base_url/);
  });
});

// ---------------------------------------------------------------------------
// normalizeSeverity
// ---------------------------------------------------------------------------
describe('normalizeSeverity', () => {
  it('accepts "low"', () => {
    assert.equal(normalizeSeverity('low'), 'low');
  });

  it('accepts "medium"', () => {
    assert.equal(normalizeSeverity('medium'), 'medium');
  });

  it('accepts "high"', () => {
    assert.equal(normalizeSeverity('high'), 'high');
  });

  it('accepts "critical"', () => {
    assert.equal(normalizeSeverity('critical'), 'critical');
  });

  it('is case insensitive', () => {
    assert.equal(normalizeSeverity('HIGH'), 'high');
    assert.equal(normalizeSeverity('Critical'), 'critical');
    assert.equal(normalizeSeverity('  Medium  '), 'medium');
  });

  it('returns null for invalid severity string', () => {
    assert.equal(normalizeSeverity('urgent'), null);
    assert.equal(normalizeSeverity('warning'), null);
  });

  it('returns null for non-string values', () => {
    assert.equal(normalizeSeverity(42), null);
    assert.equal(normalizeSeverity(null), null);
    assert.equal(normalizeSeverity(undefined), null);
    assert.equal(normalizeSeverity({}), null);
  });
});

// ---------------------------------------------------------------------------
// truncateDiff
// ---------------------------------------------------------------------------
describe('truncateDiff', () => {
  it('returns unchanged for short diffs', () => {
    const result = truncateDiff('hello world');
    assert.equal(result.text, 'hello world');
    assert.equal(result.truncated, false);
  });

  it('truncates diffs exceeding the limit', () => {
    const longDiff = 'x'.repeat(200_000);
    const result = truncateDiff(longDiff);
    assert.equal(result.truncated, true);
    assert.ok(result.text.length < longDiff.length, 'truncated text should be shorter');
  });

  it('includes truncation marker in truncated output', () => {
    const longDiff = 'a'.repeat(200_000);
    const result = truncateDiff(longDiff);
    assert.ok(result.text.includes('[diff truncated for token safety]'));
  });

  it('does not truncate diff exactly at the limit', () => {
    // MAX_DIFF_CHARS is 120000
    const exactDiff = 'y'.repeat(120_000);
    const result = truncateDiff(exactDiff);
    assert.equal(result.truncated, false);
    assert.equal(result.text, exactDiff);
  });
});

// ---------------------------------------------------------------------------
// coerceFinding
// ---------------------------------------------------------------------------
describe('coerceFinding', () => {
  const validFinding = {
    severity: 'high',
    title: 'Missing null check',
    summary: 'The function does not check for null before dereferencing.',
    filePath: 'src/index.ts',
    line: 42,
    confidence: 0.9
  };

  it('returns a valid finding with all fields', () => {
    const result = coerceFinding(validFinding);
    assert.ok(result !== null);
    assert.equal(result!.severity, 'high');
    assert.equal(result!.title, 'Missing null check');
    assert.equal(result!.filePath, 'src/index.ts');
    assert.equal(result!.line, 42);
    assert.equal(result!.confidence, 0.9);
  });

  it('returns null for missing severity', () => {
    const result = coerceFinding({ ...validFinding, severity: undefined });
    assert.equal(result, null);
  });

  it('returns null for missing title', () => {
    const result = coerceFinding({ ...validFinding, title: '' });
    assert.equal(result, null);
  });

  it('returns null for non-object input', () => {
    assert.equal(coerceFinding('string'), null);
    assert.equal(coerceFinding(42), null);
    assert.equal(coerceFinding(true), null);
  });

  it('returns null for null input', () => {
    assert.equal(coerceFinding(null), null);
  });

  it('clamps confidence to 0-1 range', () => {
    const overOne = coerceFinding({ ...validFinding, confidence: 1.5 });
    assert.equal(overOne!.confidence, 1);

    const belowZero = coerceFinding({ ...validFinding, confidence: -0.5 });
    assert.equal(belowZero!.confidence, 0);
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(200);
    const result = coerceFinding({ ...validFinding, title: longTitle });
    assert.ok(result !== null);
    assert.ok(result!.title.length <= 80, `title length ${result!.title.length} should be <= 80`);
    assert.ok(result!.title.endsWith('...'));
  });

  it('accepts "file" as alias for "filePath"', () => {
    const finding = { ...validFinding, filePath: undefined, file: 'lib/utils.ts' };
    const result = coerceFinding(finding);
    assert.ok(result !== null);
    assert.equal(result!.filePath, 'lib/utils.ts');
  });
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------
describe('buildPrompt', () => {
  const baseRequest = {
    diff: 'diff --git a/file.ts\n+ added line',
    files: [
      { path: 'src/app.ts', status: 'modified' as const },
      { path: 'src/new.ts', status: 'added' as const }
    ],
    context: {
      repoFullName: 'owner/repo',
      prNumber: 123,
      reviewTone: 'strict'
    }
  };

  it('includes diff content', () => {
    const prompt = buildPrompt(baseRequest, false);
    assert.ok(prompt.includes('diff --git a/file.ts'));
    assert.ok(prompt.includes('+ added line'));
  });

  it('includes file list', () => {
    const prompt = buildPrompt(baseRequest, false);
    assert.ok(prompt.includes('src/app.ts'));
    assert.ok(prompt.includes('src/new.ts'));
  });

  it('includes repo and PR context', () => {
    const prompt = buildPrompt(baseRequest, false);
    assert.ok(prompt.includes('owner/repo'));
    assert.ok(prompt.includes('123'));
  });

  it('notes truncation when flagged', () => {
    const prompt = buildPrompt(baseRequest, true);
    assert.ok(prompt.includes('truncated'), 'should mention truncation');
  });

  it('does not mention truncation when not flagged', () => {
    const prompt = buildPrompt(baseRequest, false);
    assert.ok(!prompt.includes('diff content was truncated'));
  });
});
