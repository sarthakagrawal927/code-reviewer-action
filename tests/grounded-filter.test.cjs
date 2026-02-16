const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterGroundedFindings,
  normalizeFindings,
  parseDiffFiles
} = require('../packages/review-core/dist/review-core/src/index.js');

test('filterGroundedFindings keeps only changed-line grounded, non-speculative findings', () => {
  const parsed = parseDiffFiles([
    {
      path: 'src/service.ts',
      patch: ['@@ -20,2 +20,2 @@', '-const a = 1;', '+const a = 2;'].join('\n')
    }
  ]);

  const normalized = normalizeFindings([
    {
      severity: 'medium',
      title: 'Maybe rename collection',
      summary: 'Consider renaming this collection for consistency and migration clarity.',
      filePath: 'src/service.ts',
      line: 20
    },
    {
      severity: 'high',
      title: 'Null check missing before use',
      summary: 'Value can be undefined on this code path and crash at runtime.',
      filePath: 'src/service.ts',
      line: 20
    },
    {
      severity: 'high',
      title: 'Not grounded to changed line',
      summary: 'Issue points to a line outside the patch.',
      filePath: 'src/service.ts',
      line: 999
    },
    {
      severity: 'high',
      title: 'No location provided',
      summary: 'This cannot be mapped to a changed line.'
    }
  ]);

  const filtered = filterGroundedFindings(normalized, parsed, { requireChangedLine: true });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Null check missing before use');
});
