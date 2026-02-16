const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDiffFiles } = require('../packages/review-core/dist/review-core/src/index.js');

test('parseDiffFiles maps changed lines and sides', () => {
  const files = [
    {
      path: 'src/example.ts',
      additions: 2,
      deletions: 1,
      patch: [
        '@@ -10,3 +10,4 @@',
        '-const oldName = "a";',
        '+const newName = "a";',
        ' const keep = true;',
        '+const added = true;'
      ].join('\n')
    }
  ];

  const parsed = parseDiffFiles(files);

  assert.equal(parsed.stats.fileCount, 1);
  assert.equal(parsed.stats.additions, 2);
  assert.equal(parsed.stats.deletions, 1);
  assert.equal(parsed.changedLines.length, 3);

  const sideMap = parsed.lineSideIndex.get('src/example.ts');
  assert.ok(sideMap);
  assert.equal(sideMap.get(10), 'RIGHT');
  assert.equal(sideMap.get(12), 'RIGHT');
});
