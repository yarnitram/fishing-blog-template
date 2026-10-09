import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env automatically if present
const localEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(localEnvPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(localEnvPath);
  } catch (e) {
    // ignore
  }
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const siteSlug = process.env.SITE_SLUG || 'kayak-fishing';

const blogContentDir = path.join(__dirname, '..', 'src', 'content', 'blog');

async function syncFromSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('ℹ️  No Supabase credentials provided in env. Skipping remote content sync.');
    return;
  }

  console.log(`🔄 Connecting to Supabase at ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Fetch site
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('id, name')
    .eq('slug', siteSlug)
    .single();

  if (siteErr || !site) {
    console.log(`⚠️  Could not find site with slug "${siteSlug}":`, siteErr?.message);
    return;
  }

  console.log(`📡 Fetching published articles for: ${site.name}...`);

  // 2. Fetch all affiliate links for shortcode replacement
  const { data: affiliates } = await supabase
    .from('affiliate_links')
    .select('*');

  const affiliateMap = new Map((affiliates || []).map((a) => [a.shortcode, a]));

  // 3. Fetch published articles
  const { data: articles, error: artErr } = await supabase
    .from('articles')
    .select('*')
    .eq('site_id', site.id)
    .eq('status', 'published');

  if (artErr) {
    console.error('❌ Error fetching articles:', artErr.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('ℹ️  No new remote articles found.');
    return;
  }

  console.log(`📝 Processing ${articles.length} articles...`);

  if (!fs.existsSync(blogContentDir)) {
    fs.mkdirSync(blogContentDir, { recursive: true });
  }

  for (const art of articles) {
    let body = art.content.replace(/^#\s+[^\n]+\n+/, '');

    // Replace [AFFILIATE_CARD:shortcode] with JSX <AffiliateCard ... />
    body = body.replace(/\[AFFILIATE_CARD:([^\]]+)\]/g, (match, shortcode) => {
      const aff = affiliateMap.get(shortcode.trim());
      if (!aff) return match;

      return `<AffiliateCard
  title="${aff.name}"
  badge="${aff.badge_text || 'Tested Pick'}"
  category="${aff.category || 'Gear'}"
  rating="${aff.rating || '4.8'}"
  price="${aff.price_estimate || 'Check Price'}"
  imageUrl="${aff.image_url || ''}"
  affiliateUrl="${aff.destination_url}"
  ctaText="${aff.cta_text || 'Check Price on Amazon'}"
  pros={${JSON.stringify(aff.pros || [])}}
  cons={${JSON.stringify(aff.cons || [])}}
/>`;
    });

    const mdxContent = `---
title: ${JSON.stringify(art.title)}
description: ${JSON.stringify(art.excerpt || art.seo_description || '')}
pubDate: '${art.published_at ? new Date(art.published_at).toDateString() : new Date().toDateString()}'
heroImage: '${art.cover_image || 'https://images.unsplash.com/photo-1762655210992-e2dd74cf3118?auto=format&fit=crop&w=1200&q=80'}'
---
import AffiliateCard from '../../components/AffiliateCard.astro';
import ComparisonTable from '../../components/ComparisonTable.astro';
import AdBanner from '../../components/AdBanner.astro';

${body}
`;

    const filePath = path.join(blogContentDir, `${art.slug}.mdx`);
    fs.writeFileSync(filePath, mdxContent, 'utf-8');
    console.log(`✅ Synced article: ${art.slug}.mdx`);
  }

  console.log('🎉 Supabase content sync completed successfully!');
}

syncFromSupabase().catch((err) => {
  console.error('❌ Sync script failed:', err);
  process.exit(1);
});
