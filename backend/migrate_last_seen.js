const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.swprcstdyskalatuvbqh:dazaran!TattooHUB2026@aws-1-eu-west-2.pooler.supabase.com:5432/postgres'
});
async function run() {
  await client.connect();
  await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT NOW();');
  console.log('Migration complete');
  await client.end();
}
run();
