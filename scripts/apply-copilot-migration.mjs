import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnvLocal } from './loadEnvLocal.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION_PATH = path.join(
  PROJECT_ROOT,
  'supabase',
  'migrations',
  '20260624000000_reserve_copilot_slot.sql',
);

loadEnvLocal();

const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function migrationSql() {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

async function rpcExistsInDatabase() {
  const candidates = resolveDatabaseCandidates();
  for (const databaseUrl of candidates) {
    const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const result = await client.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'reserve_copilot_slot'
        ) AS exists`,
      );
      await client.end();
      if (result.rows[0]?.exists === true) {
        return true;
      }
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

async function rpcExists() {
  if (await rpcExistsInDatabase()) {
    return true;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to read PostgREST schema (${response.status})`);
  }

  const spec = await response.json();
  return Object.prototype.hasOwnProperty.call(spec.paths ?? {}, '/rpc/reserve_copilot_slot');
}

async function applyViaProjectDatabaseApi(sql) {
  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  const endpoints = ['/database/query', '/pg/query', '/sql'];
  for (const endpoint of endpoints) {
    const response = await fetch(`${supabaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      return true;
    }
  }

  return false;
}

async function applyViaManagementApi(sql) {
  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  let projectRef;
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return false;
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/migrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
      name: 'reserve_copilot_slot',
    }),
  });

  if (response.ok) {
    return true;
  }

  const detail = await response.text();
  console.warn(`[db] Management API migration failed (${response.status}): ${detail.slice(0, 240)}`);
  return false;
}

function resolveDatabaseCandidates() {
  const direct = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (direct) {
    return [direct];
  }

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password || !supabaseUrl) {
    return [];
  }

  let projectRef;
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return [];
  }

  const encodedPassword = encodeURIComponent(password);
  const candidates = [
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ];

  const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'eu-central-2',
    'eu-north-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-south-1',
    'sa-east-1',
    'ca-central-1',
  ];

  for (const region of regions) {
    for (const prefix of ['aws-0', 'aws-1']) {
      candidates.push(
        `postgresql://postgres.${projectRef}:${encodedPassword}@${prefix}-${region}.pooler.supabase.com:6543/postgres`,
      );
      candidates.push(
        `postgresql://postgres.${projectRef}:${encodedPassword}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
      );
    }
  }

  return candidates;
}

async function applyViaPostgres() {
  const candidates = resolveDatabaseCandidates();
  if (candidates.length === 0) {
    return false;
  }

  let lastError = 'unknown connection error';

  for (const databaseUrl of candidates) {
    const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(migrationSql());
      await client.end();
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  console.warn(`[db] Postgres connection failed after ${candidates.length} attempts: ${lastError}`);
  return false;
}

async function main() {
  if (await rpcExists()) {
    console.log('[db] reserve_copilot_slot already exists — migration skipped.');
    return;
  }

  console.log('[db] reserve_copilot_slot missing — applying migration…');

  const sql = migrationSql();
  const applied =
    (await applyViaPostgres()) ||
    (await applyViaManagementApi(sql)) ||
    (await applyViaProjectDatabaseApi(sql));
  if (!applied) {
    throw new Error(
      'Cannot apply migration automatically. Add SUPABASE_DB_URL or SUPABASE_DB_PASSWORD (from Supabase → Project Settings → Database) to .env.local, then re-run npm run db:migrate.',
    );
  }

  if (!(await rpcExists())) {
    throw new Error('Migration ran but reserve_copilot_slot is still missing.');
  }

  console.log('[db] Migration applied successfully.');
}

main().catch((error) => {
  console.error('[db] Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
