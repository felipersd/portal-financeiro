async function probe(base, revision) {
    if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid revision');
    const response = async (path, status, method = 'GET') => {
        const url = new URL(path, base);
        url.searchParams.set('release_check', revision);
        const result = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(5000),
            headers: { 'Cache-Control': 'no-cache' } });
        if (result.status !== status) throw new Error(`Unexpected response for ${path}: ${result.status}`);
        return result;
    };
    for (const service of ['identity', 'finance']) {
        const health = await (await response(`/health/${service}`, 200)).json();
        if (health.status !== 'ok' || health.revision !== revision) throw new Error(`Wrong ${service} revision or health`);
    }
    const version = await (await response('/version.json', 200)).json();
    if (version.revision !== revision) throw new Error('Wrong frontend revision');
    await response('/', 200);
    await response('/api/transactions', 401);
    await response('/api/notifications', 401);
    await response('/api/users', 404, 'POST');
}
module.exports = { probe };
if (require.main === module || process.argv[1] === '-') probe(process.argv[2], process.argv[3]).then(() => {
    console.log('Release health, revisions and unauthenticated boundaries verified.');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
