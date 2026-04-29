/**
 * Complete Supabase setup script
 *
 * Usage:
 *   node scripts/setup-supabase.mjs <ACCESS_TOKEN> <SERVICE_ROLE_KEY>
 *
 * Get ACCESS_TOKEN from:     https://supabase.com/dashboard/account/tokens
 * Get SERVICE_ROLE_KEY from:  https://supabase.com/dashboard/project/bhdtgeuohdjenmhireec/settings/api
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'bhdtgeuohdjenmhireec';
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const MGMT_API = 'https://api.supabase.com';

const ACCESS_TOKEN = process.argv[2];
const SERVICE_ROLE_KEY = process.argv[3];

if (!ACCESS_TOKEN || !SERVICE_ROLE_KEY) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  Supabase Setup Script                                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    node scripts/setup-supabase.mjs <ACCESS_TOKEN> <SRK>      ║
║                                                              ║
║  ACCESS_TOKEN:                                               ║
║    Dashboard → Account → Access Tokens → Generate New        ║
║    https://supabase.com/dashboard/account/tokens             ║
║                                                              ║
║  SERVICE_ROLE_KEY (SRK):                                     ║
║    Dashboard → Project Settings → API → service_role key     ║
║    https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────

async function runSQL(sql, label) {
  const maxLen = 1024 * 500; // 500 KB per request limit
  if (sql.length > maxLen) {
    // Split into smaller chunks at statement boundaries
    return await runSQLChunked(sql, label);
  }

  console.log(`  ⏳ ${label}...`);
  const res = await fetch(`${MGMT_API}/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // Check for errors in the response
  if (Array.isArray(data)) {
    for (const result of data) {
      if (result.error) {
        throw new Error(`SQL error: ${result.error}`);
      }
    }
  }
  console.log(`  ✅ ${label}`);
  return data;
}

async function runSQLChunked(sql, label) {
  // Split SQL into individual statements
  const statements = [];
  let current = '';
  let inString = false;
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inDollarQuote) {
      current += ch;
      if (current.endsWith(dollarTag)) {
        inDollarQuote = false;
      }
      continue;
    }

    if (ch === '$' && sql[i + 1] === '$') {
      // Find the dollar-quote tag
      let j = i + 2;
      while (j < sql.length && sql[j] !== '$') j++;
      dollarTag = sql.substring(i, j + 1);
      if (dollarTag === '$$') dollarTag = '$$';
      inDollarQuote = true;
      current += ch;
      continue;
    }

    if (ch === "'" && !inString) {
      inString = true;
      current += ch;
      continue;
    }
    if (ch === "'" && inString) {
      if (sql[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = false;
      current += ch;
      continue;
    }

    if (ch === ';' && !inString && !inDollarQuote) {
      current += ch;
      const trimmed = current.trim();
      if (trimmed && trimmed !== ';') {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }
  if (current.trim()) {
    statements.push(current.trim());
  }

  // Group statements into chunks under the size limit
  const chunks = [];
  let chunk = '';
  for (const stmt of statements) {
    if ((chunk + '\n' + stmt).length > 400000 && chunk) {
      chunks.push(chunk);
      chunk = stmt;
    } else {
      chunk = chunk ? chunk + '\n' + stmt : stmt;
    }
  }
  if (chunk) chunks.push(chunk);

  console.log(`  ⏳ ${label} (${chunks.length} chunks, ${statements.length} statements)...`);

  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(`${MGMT_API}/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: chunks[i] }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SQL chunk ${i + 1}/${chunks.length} failed (${res.status}): ${text.substring(0, 500)}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      for (const result of data) {
        if (result.error) {
          // Some errors are OK (e.g. "already exists")
          if (!result.error.includes('already exists') && !result.error.includes('duplicate')) {
            console.warn(`  ⚠️  Chunk ${i + 1}: ${result.error}`);
          }
        }
      }
    }
    process.stdout.write(`  📦 Chunk ${i + 1}/${chunks.length}\r`);
  }
  console.log(`  ✅ ${label}`);
}

async function createAuthUser(email, password, fullName, userId) {
  console.log(`  ⏳ Creating user ${email} (${fullName})...`);

  const res = await fetch(`${PROJECT_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: userId,
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.msg?.includes('already been registered') || err.message?.includes('already been registered')) {
      console.log(`  ⏩ User ${email} already exists, skipping`);
      return;
    }
    throw new Error(`Create user failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  console.log(`  ✅ Created ${email} → ${data.id}`);
  return data;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Starting Supabase setup for project:', PROJECT_REF);
  console.log('═'.repeat(60));

  // Step 1: Verify access
  console.log('\n📋 Step 1: Verify API access...');
  try {
    const checkRes = await fetch(`${MGMT_API}/v1/projects/${PROJECT_REF}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    if (!checkRes.ok) throw new Error(`Status ${checkRes.status}`);
    const proj = await checkRes.json();
    console.log(`  ✅ Connected to project: ${proj.name} (${proj.region})`);
  } catch (e) {
    console.error(`  ❌ Cannot access project. Check your ACCESS_TOKEN.`);
    console.error(`     Error: ${e.message}`);
    process.exit(1);
  }

  // Step 2: Run schema migrations
  console.log('\n📋 Step 2: Apply schema migrations...');
  const migrationSQL = readFileSync(resolve(__dirname, 'combined-migrations.sql'), 'utf-8');
  await runSQL(migrationSQL, 'Schema migrations (14 migrations)');

  // Step 3: Run template tables migration
  console.log('\n📋 Step 3: Apply template tables migration...');
  const templateSQL = readFileSync(
    resolve(__dirname, '..', 'supabase', 'migrations', '20260311000000_create_templates.sql'),
    'utf-8'
  );
  await runSQL(templateSQL, 'Template tables migration');

  // Step 4: Create auth users
  console.log('\n📋 Step 4: Create auth users...');
  const users = [
    { email: 'isaac@shuffll.com', password: 'Temp1234!', fullName: 'Isaac', userId: '9f1987ec-cc05-48b2-a51a-946cca512008' },
    { email: 'ike@shuffll.com', password: 'Temp1234!', fullName: 'Ike', userId: 'e21359fd-a343-4d47-800e-730461bdfa50' },
    { email: 'noam@shuffll.com', password: 'Temp1234!', fullName: 'noam', userId: 'fe0730dd-9f9b-4d91-bd7c-0747e68b4c66' },
    { email: 'chen@shuffll.com', password: 'Temp1234!', fullName: 'Chen Samet', userId: '83423521-abaa-4625-8d3c-e5ef6224c4d6' },
    { email: 'aviv@shuffll.com', password: 'Temp1234!', fullName: 'Aviv Kazoomski', userId: '7b920f58-01e8-471f-bebd-17c272821913' },
  ];

  console.log('  ℹ️  Note: Users will be created with temporary password "Temp1234!"');
  console.log('  ℹ️  Email addresses are guessed — edit the script if they differ.\n');

  for (const u of users) {
    try {
      await createAuthUser(u.email, u.password, u.fullName, u.userId);
    } catch (e) {
      console.error(`  ❌ Failed to create ${u.email}: ${e.message}`);
      console.error(`     You may need to create this user manually.`);
    }
  }

  // Step 5: Seed data
  console.log('\n📋 Step 5: Seed application data...');
  const seedSQL = readFileSync(resolve(__dirname, 'seed-data.sql'), 'utf-8');
  await runSQL(seedSQL, 'Seed data (8 tables)');

  // Step 6: Verify
  console.log('\n📋 Step 6: Verify data...');
  const verifySQL = `
    SELECT 'meta_organizations' as tbl, count(*) as cnt FROM meta_organizations
    UNION ALL SELECT 'organizations', count(*) FROM organizations
    UNION ALL SELECT 'profiles', count(*) FROM profiles
    UNION ALL SELECT 'user_roles', count(*) FROM user_roles
    UNION ALL SELECT 'meta_org_memberships', count(*) FROM meta_organization_memberships
    UNION ALL SELECT 'system_settings', count(*) FROM system_settings
    UNION ALL SELECT 'excel_settings', count(*) FROM organization_excel_settings
    UNION ALL SELECT 'campaigns', count(*) FROM campaigns
    UNION ALL SELECT 'templates', count(*) FROM templates
    UNION ALL SELECT 'template_scenes', count(*) FROM template_scenes;
  `;
  const verifyData = await runSQL(verifySQL, 'Verification query');
  console.log('\n  📊 Table row counts:');
  if (Array.isArray(verifyData) && verifyData.length > 0) {
    const rows = verifyData[0]?.rows || verifyData;
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        const row = r.rows ? r.rows[0] : r;
        if (row?.tbl) {
          console.log(`     ${row.tbl.padEnd(25)} ${row.cnt} rows`);
        }
      });
    }
  }
  // Fallback: just show raw
  console.log('  Raw:', JSON.stringify(verifyData).substring(0, 500));

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update user emails in Supabase Auth if the guessed ones differ');
  console.log('  2. Change temporary passwords for all users');
  console.log('  3. Run: cd shuffll-correct && npm run dev');
  console.log('  4. Login with your email + "Temp1234!" password');
  console.log('');
}

main().catch(e => {
  console.error('\n❌ Setup failed:', e.message);
  process.exit(1);
});
