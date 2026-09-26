const fs = require('node:fs');

function validateManifest(manifest, revision) {
    if (!/^[a-f0-9]{40}$/.test(revision) || manifest?.revision !== revision) {
        throw new Error('Release manifest does not match the selected commit.');
    }
    const services = ['IDENTITY', 'FINANCE', 'FRONTEND', 'GATEWAY'];
    if (!manifest.images || Object.keys(manifest.images).length !== services.length) {
        throw new Error('Release manifest must contain exactly four images.');
    }
    return services.map(service => {
        const key = `${service}_IMAGE`;
        const image = manifest.images[key];
        const pattern = new RegExp(`^ghcr\\.io/felipersd/portal-financeiro-${service.toLowerCase()}@sha256:[a-f0-9]{64}$`);
        if (typeof image !== 'string' || image.includes('\n') || image.includes('\r') || !pattern.test(image)) {
            throw new Error(`Invalid digest for ${service}.`);
        }
        return `${key}=${image}`;
    }).join('\n');
}

module.exports = { validateManifest };
if (require.main === module) {
    try {
        console.log(validateManifest(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), process.argv[3]));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
