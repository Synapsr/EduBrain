import { isDemoMode, parseServerEnv, type ServerEnv } from '@edubrain/core/env';
import { createDb, type Database } from '@edubrain/db';
import { type AuthProvider, MockAuthProvider } from './auth';
import { createLogger, type Logger } from './logger';
import { type ChatModelResolver, createChatModelResolver } from './providers';
import { createEmbedder, type Embedder } from './rag/embed';

/**
 * Contexte applicatif partagé : environnement validé, client base de données,
 * logger, indicateur de mode démo, et résolveur de modèle de chat. Construit
 * une fois au démarrage et injecté dans l'app Hono (pattern *factory* —
 * testable, pas d'état global).
 */
export interface AppContext {
  env: ServerEnv;
  db: Database;
  logger: Logger;
  demoMode: boolean;
  resolveChatModel: ChatModelResolver;
  embedder: Embedder;
  auth: AuthProvider;
}

/** Construit le contexte à partir d'un environnement déjà validé. */
export function createContext(env: ServerEnv): AppContext {
  const logger = createLogger(env.NODE_ENV);
  const db = createDb(env.DATABASE_URL);
  const demoMode = isDemoMode(env);
  const resolveChatModel = createChatModelResolver(env, demoMode);
  const embedder = createEmbedder(env, demoMode);
  const auth = new MockAuthProvider(db);
  return { env, db, logger, demoMode, resolveChatModel, embedder, auth };
}

/** Valide l'environnement (échec précoce) puis construit le contexte. */
export function createContextFromEnv(): AppContext {
  return createContext(parseServerEnv());
}
