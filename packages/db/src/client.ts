import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/**
 * Crée un client Drizzle (driver postgres.js) connecté à `connectionString`.
 *
 * Pattern *factory* volontaire : on ne lit jamais `process.env` à l'import, ce
 * qui évite les pièges d'ordre d'évaluation des modules ESM et rend la couche
 * testable (on injecte l'URL validée par `parseServerEnv`).
 */
export function createDb(connectionString: string, options?: { max?: number }) {
  const client = postgres(connectionString, { max: options?.max ?? 10 });
  return drizzle({ client, schema, casing: 'snake_case' });
}
