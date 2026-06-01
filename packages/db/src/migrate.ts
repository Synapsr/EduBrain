import { fileURLToPath } from 'node:url';
import { loadRootEnv, parseServerEnv } from '@edubrain/core/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Applique toutes les migrations en attente (dossier `drizzle/`).
 * La première migration active l'extension pgvector (`CREATE EXTENSION vector`).
 *
 * Usage : `pnpm db:migrate` (à la racine) ou en CI avant les tests.
 */
async function main(): Promise<void> {
  loadRootEnv();
  const env = parseServerEnv();

  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  const sql = postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);

  console.log('[db] application des migrations…');
  await migrate(db, { migrationsFolder });
  await sql.end();
  console.log('[db] migrations appliquées.');
}

main().catch((err) => {
  console.error('[db] échec des migrations :', err);
  process.exit(1);
});
