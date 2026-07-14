const { PrismaClient } = require('./backend/dist/generated/client');
const prisma = new PrismaClient();
async function run() {
    console.log('Querying table row counts...');
    const tables = ['AuditLog', 'Notification', 'User', 'Lead', 'Interaction', 'WhatsAppMessage'];
    for (const table of tables) {
        try {
            const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`${table} row count:`, countRes[0].count);
        } catch (e) {
            console.error(`Error counting ${table}:`, e.message);
        }
    }

    console.log('\nQuerying indexes on AuditLog table...');
    const indexesRes = await prisma.$queryRawUnsafe("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'AuditLog'");
    console.log('Indexes:', indexesRes);

    console.log('\nChecking for blocked/blocking queries...');
    const blocks = await prisma.$queryRawUnsafe(`
        SELECT 
            blocked_locks.pid     AS blocked_pid,
            blocked_activity.query    AS blocked_statement,
            blocking_locks.pid    AS blocking_pid,
            blocking_activity.query   AS blocking_statement
        FROM  pg_catalog.pg_locks         blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks         blocking_locks 
            ON blocking_locks.locktype = blocked_locks.locktype
            AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
            AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
            AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
            AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
            AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
            AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
            AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
            AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
            AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
            AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted
    `);
    console.log('Blocked/blocking queries:', blocks);
}
run()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
