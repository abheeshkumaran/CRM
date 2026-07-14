const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Abhy@123@localhost:5432/pypecrm?schema=public'
});

async function main() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;`);
    await client.query(`ALTER TABLE "Lead" ALTER COLUMN "status" TYPE TEXT USING "status"::text;`);
    await client.query(`ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'new';`);
    console.log('Column altered successfully via pg');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
