const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  await client.connect();
  await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT NOW();');
  console.log('Migration complete');
  await client.end();
}
run();
