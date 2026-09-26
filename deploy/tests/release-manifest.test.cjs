const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateManifest } = require('../validate-release-manifest.cjs');
const revision = 'a'.repeat(40);
function fixture() {
    return { revision, images: Object.fromEntries(['IDENTITY', 'FINANCE', 'FRONTEND', 'GATEWAY']
        .map(service => [`${service}_IMAGE`, `ghcr.io/felipersd/portal-financeiro-${service.toLowerCase()}@sha256:${'b'.repeat(64)}`])) };
}
test('exports only the four approved image digests for the selected commit', () => {
    const manifest = fixture();
    assert.equal(validateManifest(manifest, revision).split('\n').length, 4);
    assert.throws(() => validateManifest(manifest, 'c'.repeat(40)), /commit/);
    delete manifest.images.FINANCE_IMAGE;
    assert.throws(() => validateManifest(manifest, revision), /four/);
});
test('rejects mutable tags, swapped services and environment injection', () => {
    for (const value of ['ghcr.io/felipersd/portal-financeiro-finance:v1.8.1',
        fixture().images.IDENTITY_IMAGE, `${fixture().images.FINANCE_IMAGE}\nEVIL=1`,
        `${fixture().images.FINANCE_IMAGE}\n`, null]) {
        const manifest = fixture();
        manifest.images.FINANCE_IMAGE = value;
        assert.throws(() => validateManifest(manifest, revision), /digest/);
    }
});
