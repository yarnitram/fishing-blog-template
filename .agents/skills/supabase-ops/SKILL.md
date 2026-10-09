---
name: supabase-ops
description: >-
  Manage Supabase database operations, schema migrations, affiliate shortcode synchronization, and automated publishing for the Fishing Network blog ecosystem. Activate this skill whenever the user asks about Supabase, database schema, syncing articles, managing affiliate links in SQL, or configuring database environments.
---

# Supabase Operations for Fishing Network

This skill equips the agent with procedures and runbooks to manage the centralized PostgreSQL database hosted on Supabase, which powers all niche fishing blogs and the Next.js control center.

---

## 🏛️ Architecture Overview

The database connects the **Dashboard** and the **Astro static blogs**:

1. **Dashboard (`fishing-dashboard`)**:
   - Manages records in `sites`, `affiliate_links`, and `articles`.
   - Runs AI generation prompts and writes output to `articles`.
   - Dispatches Vercel build webhooks.

2. **Astro Blogs (`fishing-blog-template`)**:
   - Executes `npm run sync` before building.
   - Fetches published articles where `site_id` matches the current site slug.
   - Converts centralized shortcodes (e.g., `[AFFILIATE_CARD:old-town-pdl-106]`) into `<AffiliateCard />` components.

---

## 🗄️ Database Tables Reference

- **`sites`**: Registered niche blogs (`id`, `name`, `slug`, `domain`, `niche`, `vercel_deploy_hook`).
- **`affiliate_links`**: Centralized products (`id`, `name`, `shortcode`, `destination_url`, `category`, `price_estimate`, `badge_text`, `rating`, `pros`, `cons`).
- **`articles`**: Content storage (`id`, `site_id`, `title`, `slug`, `content`, `status`, `seo_title`, `seo_description`, `keywords`).
- **`ad_slots`**: Ad network tags and custom banner snippets (`id`, `site_id`, `name`, `slot_key`, `code_snippet`, `is_active`).

The full SQL migration script is located at:
`fishing-dashboard/supabase/schema.sql`

---

## 🚀 Common Workflows

### 1. Test Supabase Connection
Run the connection test script from the project root:
```bash
node .agents/skills/supabase-ops/scripts/test-connection.mjs
```

### 2. Manual Content Sync to Astro
To pull all published articles and affiliate links into Astro locally:
```bash
cd fishing-blog-template
npm run sync
```

### 3. Deploying Schema Changes
When schema updates are needed, add migration statements to `fishing-dashboard/supabase/schema.sql` and run them via the Supabase Dashboard SQL Editor or Supabase CLI.
