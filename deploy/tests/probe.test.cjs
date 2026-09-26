const { test } = require('node:test');
const assert = require('node:assert/strict');
const { probe } = require('../probe-release.cjs');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const revision = 'a'.repeat(40);
test('requires matching APIs/frontend, healthy dependencies and authentication', async t => {
    const fetch = t.mock.method(globalThis, 'fetch', async url => {
        const path = url.pathname;
        const status = path === '/api/users' ? 404 : path.startsWith('/api/') ? 401 : 200;
        return new Response(JSON.stringify({ status: 'ok', revision }), { status });
    });
    await probe('https://fixture.invalid', revision);
    assert.equal(fetch.mock.callCount(), 7);
    fetch.mock.mockImplementation(async () => new Response(JSON.stringify({ status: 'ok', revision: 'b'.repeat(40) })));
    await assert.rejects(probe('https://fixture.invalid', revision), /revision/);
    fetch.mock.mockImplementation(async () => new Response('', { status: 503 }));
    await assert.rejects(probe('https://fixture.invalid', revision), /503/);
});
test('stdin invocation used by Docker rejects invalid release metadata', () => {
    const run = spawnSync(process.execPath, ['-', 'http://fixture.invalid', 'invalid'], {
        input: readFileSync(require.resolve('../probe-release.cjs')), encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Invalid revision/);
});
