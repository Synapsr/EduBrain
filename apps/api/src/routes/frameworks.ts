import { frameworkInputSchema, frameworkUpdateSchema } from '@edubrain/core/frameworks';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../context';
import {
  createFramework,
  deleteFramework,
  duplicateFramework,
  getFramework,
  listFrameworks,
  updateFramework,
} from '../services/frameworks';

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

/**
 * CRUD des Cadres d'usage (+ duplication pour le partage). Verrouillé sur
 * l'enseignant courant (auth mockée).
 */
export function createFrameworksRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.get('/api/frameworks', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const items = await listFrameworks(ctx.db, teacher.id);
    return c.json({ frameworks: items });
  });

  route.post('/api/frameworks', async (c) => {
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const body = await c.req.json().catch(() => null);
    const parsed = frameworkInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'Cadre invalide.', issues: parsed.error.issues.map((i) => i.message) },
        400,
      );
    }
    const created = await createFramework(ctx.db, teacher.id, parsed.data);
    return c.json({ framework: created }, 201);
  });

  route.get('/api/frameworks/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const framework = await getFramework(ctx.db, id, teacher.id);
    if (!framework) return c.json({ error: 'Cadre introuvable.' }, 404);
    return c.json({ framework });
  });

  route.patch('/api/frameworks/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const body = await c.req.json().catch(() => null);
    const parsed = frameworkUpdateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Cadre invalide.' }, 400);
    const updated = await updateFramework(ctx.db, id, teacher.id, parsed.data);
    if (!updated) return c.json({ error: 'Cadre introuvable.' }, 404);
    return c.json({ framework: updated });
  });

  route.delete('/api/frameworks/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const ok = await deleteFramework(ctx.db, id, teacher.id);
    if (!ok) return c.json({ error: 'Cadre introuvable.' }, 404);
    return c.body(null, 204);
  });

  route.post('/api/frameworks/:id/duplicate', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const copy = await duplicateFramework(ctx.db, id, teacher.id);
    if (!copy) return c.json({ error: 'Cadre introuvable.' }, 404);
    return c.json({ framework: copy }, 201);
  });

  return route;
}
