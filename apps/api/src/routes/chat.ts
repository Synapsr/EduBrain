import { chatRequestSchema } from '@edubrain/core/chat';
import type { UIMessage } from 'ai';
import { Hono } from 'hono';
import type { AppContext } from '../context';
import {
  composeSystemAndSources,
  lastUserQuery,
  streamChatResponse,
} from '../services/chat-stream';
import { getConversation } from '../services/conversations';
import { getFramework } from '../services/frameworks';

/**
 * `POST /api/chat` — chat de l'enseignant. Compile le Cadre appliqué, injecte le
 * RAG (documents conversation + Cadre), streame et persiste (via chat-stream).
 */
export function createChatRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.post('/api/chat', async (c) => {
    const json = await c.req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return c.json(
        { error: 'Requête invalide.', issues: parsed.error.issues.map((i) => i.message) },
        400,
      );
    }
    const { messages, conversationId, modelTier } = parsed.data;

    const teacher = await ctx.auth.getCurrentTeacher(c);
    const conversation = await getConversation(ctx.db, conversationId, teacher.id);
    if (!conversation) return c.json({ error: 'Conversation introuvable.' }, 404);

    const uiMessages = messages as unknown as UIMessage[];
    const framework = conversation.frameworkId
      ? await getFramework(ctx.db, conversation.frameworkId, teacher.id)
      : null;

    const { system, sources } = await composeSystemAndSources(ctx, {
      framework,
      query: lastUserQuery(uiMessages),
      scope: { conversationId, frameworkId: conversation.frameworkId },
    });

    return streamChatResponse(ctx, {
      model: ctx.resolveChatModel(modelTier),
      system,
      uiMessages,
      conversationId,
      sources,
    });
  });

  return route;
}
