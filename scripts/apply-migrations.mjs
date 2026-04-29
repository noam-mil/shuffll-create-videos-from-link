import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const DB_URL = 'postgresql://postgres:bX4nLk77vX_3r4D@db.bhdtgeuohdjenmhireec.supabase.co:5432/postgres';

const migrationsDir = path.resolve('supabase/migrations');

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database');

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying: ${file}...`);
    try {
      await client.query(sql);
      console.log(`  OK`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      // Continue with other migrations - some might fail if already applied
    }
  }

  await client.end();
  console.log('Done');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
