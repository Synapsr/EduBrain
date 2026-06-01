import { MODEL_TIERS } from '@edubrain/core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../context';
import {
  createConversation,
  deleteConversation,
  getConversation,
  getMessages,
  listConversations,
  updateConversation,
} from '../services/conversations';
import { getFramework } from '../services/frameworks';

const createSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  modelTier: z.enum(MODEL_TIERS).optional(),
  frameworkId: z.uuid().nullish(),
});

const updateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    modelTier: z.enum(MODEL_TIERS).optional(),
    frameworkId: z.uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucune modification fournie.' });

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

/**
 * CRUD des conversations (liste, création, chargement avec messages, renommage,
 * suppression). Verrouillé sur l'enseignant courant (auth mockée).
 */
export function createConversationsRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.get('/api/conversations', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const items = await listConversations(ctx.db, teacher.id);
    return c.json({ conversations: items });
  });

  route.post('/api/conversations', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const body = await c.req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Requête invalide.' }, 400);
    const created = await createConversation(ctx.db, teacher.id, parsed.data);
    return c.json({ conversation: created }, 201);
  });

  route.get('/api/conversations/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const conversation = await getConversation(ctx.db, id, teacher.id);
    if (!conversation) return c.json({ error: 'Conversation introuvable.' }, 404);
    const messages = await getMessages(ctx.db, id);
    return c.json({ conversation, messages });
  });

  route.patch('/api/conversations/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const body = await c.req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Requête invalide.' }, 400);

    // Appliquer un Cadre : vérifier qu'il appartient bien à l'enseignant.
    if (parsed.data.frameworkId) {
      const framework = await getFramework(ctx.db, parsed.data.frameworkId, teacher.id);
      if (!framework) return c.json({ error: 'Cadre introuvable.' }, 404);
    }

    const updated = await updateConversation(ctx.db, id, teacher.id, parsed.data);
    if (!updated) return c.json({ error: 'Conversation introuvable.' }, 404);
    return c.json({ conversation: updated });
  });

  route.delete('/api/conversations/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const ok = await deleteConversation(ctx.db, id, teacher.id);
    if (!ok) return c.json({ error: 'Conversation introuvable.' }, 404);
    return c.body(null, 204);
  });

  return route;
}
