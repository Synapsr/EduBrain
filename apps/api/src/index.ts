import { loadRootEnv, parseServerEnv } from '@edubrain/core/env';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createContext } from './context';

/**
 * Point d'entrée de l'API. Échec précoce si l'environnement est invalide
 * (la validation Zod lève une erreur lisible avant tout démarrage réseau).
 */
loadRootEnv();
const ctx = createContext(parseServerEnv());
const app = createApp(ctx);

const server = serve({ fetch: app.fetch, port: ctx.env.API_PORT }, (info) => {
  ctx.logger.info(
    { port: info.port, demoMode: ctx.demoMode },
    `API EduBrain démarrée sur http://localhost:${info.port}${ctx.demoMode ? ' (mode démo)' : ''}`,
  );
});

const shutdown = (signal: string) => {
  ctx.logger.info({ signal }, 'arrêt de l’API…');
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
