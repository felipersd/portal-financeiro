const fs = require('node:fs');
const crypto = require('node:crypto');

function validateMigrationState(expected, applied) {
    if (applied.some(row => !row.finished_at && !row.rolled_back_at)) {
        throw new Error('Unresolved database migration. Active application was preserved.');
    }
    const completed = new Map(applied.filter(row => row.finished_at && !row.rolled_back_at)
        .map(row => [row.migration_name, row.checksum]));
    if (completed.size !== expected.length || expected.some(row => completed.get(row.name) !== row.checksum)) {
        throw new Error('Schema changes require a separate reviewed expand/contract operation. Blue/green never migrates the active database.');
    }
}

async function main() {
    const schema = process.argv[2];
    if (!['identity', 'finance'].includes(schema)) throw new Error('Invalid schema');
    const { Client } = require('pg');
    const directory = '/app/prisma/migrations';
    const expected = fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory())
        .map(entry => ({ name: entry.name, checksum: crypto.createHash('sha256')
            .update(fs.readFileSync(`${directory}/${entry.name}/migration.sql`)).digest('hex') }));
    const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 5000 });
    try {
        await db.connect();
        const rows = await db.query(`SELECT migration_name,checksum,finished_at,rolled_back_at FROM "${schema}"."_prisma_migrations"`);
        validateMigrationState(expected, rows.rows);
        console.log(`${schema}: schema matches the candidate; no migrations executed.`);
    } finally { await db.end(); }
}
module.exports = { validateMigrationState };
if (require.main === module || process.argv[1] === '-') main().catch(error => {
    console.error(error.message.startsWith('Schema changes') || error.message.startsWith('Unresolved')
        ? error.message : 'Could not verify database compatibility. Active application was preserved.');
    process.exitCode = 1;
});
