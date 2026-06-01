import { parseServerEnv } from '@edubrain/core/env';
import { hashingEmbedding } from '@edubrain/core/rag';
import type { Database } from '@edubrain/db';
import { pino } from 'pino';
import type { AppContext } from './context';
import { echoModel } from './providers';

const silentLogger = pino({ level: 'silent' });

/**
 * Contexte applicatif pour les tests : base injoignable par défaut (pour
 * vérifier la dégradation gracieuse), provider mock, auth stub. Surchargez les
 * champs au besoin.
 */
export function makeTestContext(overrides: Partial<AppContext> = {}): AppContext {
  const unreachableDb = {
    execute: () => Promise.reject(new Error('db indisponible en test')),
  } as unknown as Database;

  return {
    env: parseServerEnv({ DATABASE_URL: 'postgres://x:y@localhost:5432/z' }),
    db: unreachableDb,
    logger: silentLogger,
    demoMode: true,
    resolveChatModel: () => echoModel,
    embedder: {
      dim: 64,
      embed: (texts) => Promise.resolve(texts.map((t) => hashingEmbedding(t, 64))),
    },
    auth: {
      getCurrentTeacher: () =>
        Promise.resolve({ id: 'demo', email: 'demo@edubrain.local', displayName: 'Démo' }),
    },
    ...overrides,
  };
}
