const test = require('node:test');
const assert = require('node:assert/strict');

const { hasBlockingFindings } = require('../packages/review-core/dist/review-core/src/index.js');

test('hasBlockingFindings respects severity threshold', () => {
  const findings = [
    { severity: 'low', title: 'Low', summary: 'low' },
    { severity: 'high', title: 'High', summary: 'high' }
  ];

  assert.equal(hasBlockingFindings(findings, 'critical'), false);
  assert.equal(hasBlockingFindings(findings, 'high'), true);
  assert.equal(hasBlockingFindings(findings, 'medium'), true);
});
