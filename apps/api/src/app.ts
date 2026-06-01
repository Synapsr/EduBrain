import { fr } from '@edubrain/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { AppContext } from './context';
import { createAccessesRoute } from './routes/accesses';
import { createChatRoute } from './routes/chat';
import { createConversationsRoute } from './routes/conversations';
import { createDocumentsRoute } from './routes/documents';
import { createFrameworksRoute } from './routes/frameworks';
import { createHealthRoute } from './routes/health';
import { createStudentRoute } from './routes/student';
import { createTranscribeRoute } from './routes/transcribe';

/**
 * Construit l'application Hono. Pattern *factory* : on injecte le contexte, ce
 * qui rend l'app testable via `app.request(...)` sans démarrer de serveur.
 *
 * Middlewares :
 *  - `secureHeaders()` : équivalent helmet (en-têtes de sécurité).
 *  - `cors()` : verrouillé sur l'origine du front (`WEB_ORIGIN`).
 *  - gestion d'erreurs gracieuse en français.
 */
export function createApp(ctx: AppContext): Hono {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: ctx.env.WEB_ORIGIN,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );

  app.get('/', (c) => c.text('EduBrain API'));
  app.route('/', createHealthRoute(ctx));
  app.route('/', createFrameworksRoute(ctx));
  app.route('/', createDocumentsRoute(ctx));
  app.route('/', createAccessesRoute(ctx));
  app.route('/', createStudentRoute(ctx));
  app.route('/', createConversationsRoute(ctx));
  app.route('/', createTranscribeRoute(ctx));
  app.route('/', createChatRoute(ctx));

  app.notFound((c) => c.json({ error: 'Ressource introuvable.' }, 404));

  app.onError((err, c) => {
    ctx.logger.error({ err, path: c.req.path }, 'erreur non gérée');
    return c.json({ error: fr.errors.generic }, 500);
  });

  return app;
}
