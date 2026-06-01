import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Charge le fichier `.env` situé à la **racine du monorepo**, quel que soit le
 * répertoire courant (les scripts pnpm filtrés s'exécutent dans le dossier du
 * paquet). On remonte l'arborescence jusqu'à `pnpm-workspace.yaml`.
 *
 * Serveur uniquement. À appeler **avant** {@link parseServerEnv}.
 */
export function loadRootEnv(): void {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      loadDotenv({ path: resolve(dir, '.env') });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  loadDotenv(); // repli : `.env` du répertoire courant
}

/**
 * Schéma de validation des variables d'environnement **côté serveur** (API).
 *
 * Principe : on échoue **tôt et clairement** au démarrage si une variable est
 * manquante ou invalide (cf. {@link parseServerEnv}). Aucune valeur secrète n'a
 * de défaut codé en dur ; les identifiants de modèles Albert ont des défauts
 * documentés mais restent surchargeables par l'environnement (l'URL/les IDs
 * exacts d'Albert peuvent évoluer — voir docs/STACK_REFERENCE.md §8).
 *
 * Ce module est **réservé au serveur** : ne l'importez jamais depuis `apps/web`
 * (il lit des secrets via `process.env`).
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // --- Albert API (IA souveraine) -----------------------------------------
  /** URL de base OpenAI-compatible d'Albert (confirmée). */
  ALBERT_BASE_URL: z.string().url().default('https://albert.api.etalab.gouv.fr/v1'),
  /**
   * Clé Albert — **optionnelle**. Absente ⇒ bascule en *mode démo* (provider
   * mock local). Jamais exposée au client.
   */
  ALBERT_API_KEY: z.string().min(1).optional(),
  /** Petit modèle par défaut (frugalité). Vérifiable via `GET /v1/models`. */
  ALBERT_CHAT_MODEL_SMALL: z
    .string()
    .min(1)
    .default('mistralai/Mistral-Small-3.2-24B-Instruct-2506'),
  /** Modèle plus puissant pour les tâches complexes. */
  ALBERT_CHAT_MODEL_LARGE: z.string().min(1).default('openai/gpt-oss-120b'),
  /** Modèle d'embeddings (Albert : `BAAI/bge-m3`, 1024 dimensions). */
  ALBERT_EMBEDDING_MODEL: z.string().min(1).default('BAAI/bge-m3'),
  /** Modèle de transcription audio→texte (Whisper). */
  ALBERT_TRANSCRIPTION_MODEL: z.string().optional(),
  /**
   * Dimension des vecteurs d'embedding = taille de la colonne pgvector.
   * Défaut 1024 (Albert `BAAI/bge-m3`). Changer cette valeur impose de
   * régénérer la migration `chunks` (la colonne `vector(N)` est figée).
   */
  ALBERT_EMBEDDING_DIM: z.coerce.number().int().positive().default(1024),

  // --- Persistance ---------------------------------------------------------
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL est requise (ex: postgres://edubrain:edubrain@localhost:5432/edubrain)'),

  // --- Réseau / CORS -------------------------------------------------------
  API_PORT: z.coerce.number().int().positive().default(8787),
  /** Origine autorisée par le CORS (le front Next.js en dev). */
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Erreur levée quand l'environnement serveur est invalide. */
export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
  constructor(public readonly issues: string[]) {
    super(`Environnement invalide :\n${issues.map((i) => `  - ${i}`).join('\n')}`);
  }
}

/**
 * Valide et normalise l'environnement serveur. Lève {@link EnvValidationError}
 * avec la liste lisible des problèmes si la validation échoue (échec précoce).
 */
export function parseServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  // Une variable définie mais vide (`FOO=`) est traitée comme **absente** :
  // les défauts s'appliquent et les champs optionnels deviennent `undefined`
  // (ex. `ALBERT_API_KEY=` ⇒ mode démo).
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    normalized[key] = value === '' ? undefined : value;
  }

  const result = serverEnvSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(racine)'}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }
  return result.data;
}

/**
 * Le serveur tourne-t-il en *mode démo* (sans clé Albert) ? Dans ce cas, le
 * provider mock prend le relais et l'UI affiche un bandeau « mode démo ».
 */
export function isDemoMode(env: Pick<ServerEnv, 'ALBERT_API_KEY'>): boolean {
  return !env.ALBERT_API_KEY;
}
