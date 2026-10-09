import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate fishing-dashboard node_modules
const dashboardPath = path.resolve(__dirname, '../../../../fishing-dashboard');
const supabaseModulePath = path.resolve(dashboardPath, 'node_modules/@supabase/supabase-js');

// Read .env.local
let supabaseUrl = '';
let supabaseKey = '';

const envPath = path.resolve(dashboardPath, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1]?.trim() || '';
    }
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.split('=')[1]?.trim() || '';
    }
  }
}

async function check() {
  console.log('🔍 Checking Supabase connectivity...');
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  No Supabase environment variables detected.');
    return;
  }

  console.log(`📡 Connecting to ${supabaseUrl}...`);
  const { pathToFileURL } = await import('url');
  const targetModuleUrl = pathToFileURL(path.join(supabaseModulePath, 'dist/index.mjs')).href;
  const { createClient } = await import(targetModuleUrl);
  const client = createClient(supabaseUrl, supabaseKey);

  const [sites, affiliates, articles] = await Promise.all([
    client.from('sites').select('id, name', { count: 'exact' }),
    client.from('affiliate_links').select('id, name', { count: 'exact' }),
    client.from('articles').select('id, title', { count: 'exact' }),
  ]);

  if (sites.error) {
    console.log(`⚠️  'sites' table not ready yet: ${sites.error.message}`);
  } else {
    console.log(`✅ Sites: ${sites.data?.length ?? 0} registered in live database`);
  }

  if (affiliates.error) {
    console.log(`⚠️  'affiliate_links' table not ready yet: ${affiliates.error.message}`);
  } else {
    console.log(`✅ Affiliate Links: ${affiliates.data?.length ?? 0} active in live database`);
  }

  if (articles.error) {
    console.log(`⚠️  'articles' table not ready yet: ${articles.error.message}`);
  } else {
    console.log(`✅ Articles: ${articles.data?.length ?? 0} recorded in live database`);
  }

  if (sites.error || affiliates.error || articles.error) {
    console.log('\n💡 Tip: Run the SQL in fishing-dashboard/supabase/schema.sql in your Supabase SQL editor to initialize tables.');
  } else {
    console.log('\n🎉 Supabase database is completely live and connected!');
  }
}

check().catch(console.error);
