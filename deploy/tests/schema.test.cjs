const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateMigrationState } = require('../check-schema.cjs');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const expected = [{ name: 'baseline', checksum: 'abc' }];
const baseline = { migration_name: 'baseline', checksum: 'abc', finished_at: 'now', rolled_back_at: null };
test('accepts only the applied, unchanged migration history', () => {
    assert.doesNotThrow(() => validateMigrationState(expected, [baseline]));
    assert.doesNotThrow(() => validateMigrationState(expected, [baseline, { finished_at: null, rolled_back_at: 'then' }]));
});
test('stdin invocation used by Docker executes validation and fails closed', () => {
    const run = spawnSync(process.execPath, ['-', 'invalid'], {
        input: readFileSync(require.resolve('../check-schema.cjs')), encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Could not verify database compatibility/);
});
test('blocks new migrations, changed SQL, older schema and unresolved failures', () => {
    for (const applied of [[], [{ ...baseline, checksum: 'changed' }], [baseline, { ...baseline, migration_name: 'extra' }],
        [baseline, { finished_at: null, rolled_back_at: null }]]) {
        assert.throws(() => validateMigrationState(expected, applied));
    }
});
