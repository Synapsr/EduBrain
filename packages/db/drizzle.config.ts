import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit s'exécute avec le cwd = packages/db ; le `.env` est à la racine.
config({ path: '../../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://edubrain:edubrain@localhost:5432/edubrain',
  },
});
