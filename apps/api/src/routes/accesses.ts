import { addStudentSchema, createAccessSchema, updateAccessSchema } from '@edubrain/core/access';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../context';
import {
  addStudent,
  createAccess,
  deleteAccess,
  getAccessDetail,
  listAccesses,
  removeStudent,
  renameAccess,
  setAccessActive,
  teacherOwnsStudentConversation,
  teacherStudentConversations,
} from '../services/access';
import { getMessages } from '../services/conversations';

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

/**
 * Accès élève (côté enseignant) : création/gestion des espaces, roster, et
 * supervision (lecture des conversations des élèves). Données fictives.
 */
export function createAccessesRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.get('/api/accesses', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    return c.json({ accesses: await listAccesses(ctx.db, teacher.id) });
  });

  route.post('/api/accesses', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const body = await c.req.json().catch(() => null);
    const parsed = createAccessSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' }, 400);
    }
    try {
      const access = await createAccess(ctx.db, teacher.id, parsed.data);
      return c.json({ access }, 201);
    } catch {
      return c.json({ error: 'Cadre introuvable.' }, 404);
    }
  });

  route.get('/api/accesses/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Accès introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const detail = await getAccessDetail(ctx.db, id, teacher.id);
    if (!detail) return c.json({ error: 'Accès introuvable.' }, 404);
    return c.json({ access: detail });
  });

  route.patch('/api/accesses/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Accès introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const parsed = updateAccessSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' }, 400);
    }
    let ok = true;
    if (parsed.data.name !== undefined) {
      ok = await renameAccess(ctx.db, id, teacher.id, parsed.data.name);
    }
    if (ok && parsed.data.active !== undefined) {
      ok = await setAccessActive(ctx.db, id, teacher.id, parsed.data.active);
    }
    if (!ok) return c.json({ error: 'Accès introuvable.' }, 404);
    return c.json({ ok: true });
  });

  route.delete('/api/accesses/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Accès introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const ok = await deleteAccess(ctx.db, id, teacher.id);
    if (!ok) return c.json({ error: 'Accès introuvable.' }, 404);
    return c.body(null, 204);
  });

  route.post('/api/accesses/:id/students', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Accès introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const parsed = addStudentSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Nom invalide.' }, 400);
    const student = await addStudent(ctx.db, id, teacher.id, parsed.data.displayName);
    if (!student) return c.json({ error: 'Accès introuvable.' }, 404);
    return c.json({ student }, 201);
  });

  route.delete('/api/students/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Élève introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const ok = await removeStudent(ctx.db, id, teacher.id);
    if (!ok) return c.json({ error: 'Élève introuvable.' }, 404);
    return c.body(null, 204);
  });

  // Supervision : conversations d'un élève + messages d'une conversation.
  route.get('/api/students/:id/conversations', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Élève introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const list = await teacherStudentConversations(ctx.db, id, teacher.id);
    if (!list) return c.json({ error: 'Élève introuvable.' }, 404);
    return c.json({ conversations: list });
  });

  route.get('/api/supervision/conversations/:id/messages', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    if (!(await teacherOwnsStudentConversation(ctx.db, id, teacher.id))) {
      return c.json({ error: 'Conversation introuvable.' }, 404);
    }
    return c.json({ messages: await getMessages(ctx.db, id) });
  });

  return route;
}
