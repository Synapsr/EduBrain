import { chatUIMessageSchema } from '@edubrain/core/chat';
import type { UIMessage } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../context';
import {
  createStudentConversation,
  getAccessByToken,
  getStudentConversation,
  listStudentConversations,
  studentInAccess,
} from '../services/access';
import {
  composeSystemAndSources,
  lastUserQuery,
  streamChatResponse,
} from '../services/chat-stream';
import { getMessages } from '../services/conversations';
import { getFramework } from '../services/frameworks';

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

const studentChatSchema = z.object({
  studentId: z.uuid(),
  conversationId: z.uuid(),
  messages: z.array(chatUIMessageSchema).min(1),
});

/**
 * Espace élève (auth mockée par le token du lien). Le Cadre de l'accès encadre
 * l'assistant ; l'élève ne configure rien. Données fictives uniquement.
 */
export function createStudentRoute(ctx: AppContext): Hono {
  const route = new Hono();

  // Infos de l'accès (nom, Cadre, roster) — pour l'écran d'identification.
  route.get('/api/e/:token', async (c) => {
    const access = await getAccessByToken(ctx.db, c.req.param('token'));
    if (!access) return c.json({ error: 'Lien invalide ou expiré.' }, 404);
    return c.json({
      access: { name: access.name, frameworkName: access.frameworkName, students: access.students },
    });
  });

  route.get('/api/e/:token/conversations', async (c) => {
    const access = await getAccessByToken(ctx.db, c.req.param('token'));
    if (!access) return c.json({ error: 'Lien invalide.' }, 404);
    const studentId = c.req.query('studentId') ?? '';
    if (!isUuid(studentId) || !(await studentInAccess(ctx.db, access.accessId, studentId))) {
      return c.json({ error: 'Élève introuvable.' }, 403);
    }
    return c.json({
      conversations: await listStudentConversations(ctx.db, access.accessId, studentId),
    });
  });

  route.post('/api/e/:token/conversations', async (c) => {
    const access = await getAccessByToken(ctx.db, c.req.param('token'));
    if (!access) return c.json({ error: 'Lien invalide.' }, 404);
    const body = (await c.req.json().catch(() => ({}))) as { studentId?: string };
    const studentId = body.studentId ?? '';
    if (!isUuid(studentId) || !(await studentInAccess(ctx.db, access.accessId, studentId))) {
      return c.json({ error: 'Élève introuvable.' }, 403);
    }
    const conversation = await createStudentConversation(
      ctx.db,
      { id: access.accessId, teacherId: access.teacherId, frameworkId: access.frameworkId },
      studentId,
    );
    return c.json({ conversation }, 201);
  });

  route.get('/api/e/:token/conversations/:id', async (c) => {
    const access = await getAccessByToken(ctx.db, c.req.param('token'));
    if (!access) return c.json({ error: 'Lien invalide.' }, 404);
    const studentId = c.req.query('studentId') ?? '';
    const id = c.req.param('id');
    if (!isUuid(studentId) || !isUuid(id)) return c.json({ error: 'Introuvable.' }, 404);
    const conversation = await getStudentConversation(ctx.db, id, access.accessId, studentId);
    if (!conversation) return c.json({ error: 'Conversation introuvable.' }, 404);
    return c.json({
      conversation: { id: conversation.id, title: conversation.title },
      messages: await getMessages(ctx.db, id),
    });
  });

  route.post('/api/e/:token/chat', async (c) => {
    const access = await getAccessByToken(ctx.db, c.req.param('token'));
    if (!access) return c.json({ error: 'Lien invalide.' }, 404);
    const parsed = studentChatSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Requête invalide.' }, 400);
    const { studentId, conversationId, messages } = parsed.data;

    if (!(await studentInAccess(ctx.db, access.accessId, studentId))) {
      return c.json({ error: 'Élève introuvable.' }, 403);
    }
    const conversation = await getStudentConversation(
      ctx.db,
      conversationId,
      access.accessId,
      studentId,
    );
    if (!conversation) return c.json({ error: 'Conversation introuvable.' }, 404);

    const uiMessages = messages as unknown as UIMessage[];
    const framework = await getFramework(ctx.db, access.frameworkId, access.teacherId);
    const { system, sources } = await composeSystemAndSources(ctx, {
      framework,
      query: lastUserQuery(uiMessages),
      scope: { conversationId, frameworkId: access.frameworkId },
    });

    return streamChatResponse(ctx, {
      model: ctx.resolveChatModel('small'),
      system,
      uiMessages,
      conversationId,
      sources,
    });
  });

  return route;
}
