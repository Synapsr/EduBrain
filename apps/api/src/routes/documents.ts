import { UPLOAD_ALLOWED_MIME, UPLOAD_MAX_BYTES } from '@edubrain/core';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../context';
import { getConversation } from '../services/conversations';
import {
  type DocumentTarget,
  deleteDocument,
  ingestDocument,
  listConversationDocuments,
  listFrameworkDocuments,
} from '../services/documents';
import { getFramework } from '../services/frameworks';

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
};

function resolveMime(file: File): string | null {
  if ((UPLOAD_ALLOWED_MIME as readonly string[]).includes(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? null;
}

/** Validation + ingestion partagées (Cadre ou conversation). */
async function handleUpload(
  ctx: AppContext,
  c: Context,
  target: DocumentTarget,
  teacherId: string,
) {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return c.json({ error: 'Aucun fichier fourni.' }, 400);

  const mime = resolveMime(file);
  if (!mime) return c.json({ error: 'Type non pris en charge (PDF, texte ou markdown).' }, 415);
  if (file.size > UPLOAD_MAX_BYTES) {
    const maxMo = Math.round(UPLOAD_MAX_BYTES / 1024 / 1024);
    return c.json({ error: `Fichier trop volumineux (max ${maxMo} Mo).` }, 413);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await ingestDocument(ctx.db, ctx.embedder, {
      ...target,
      teacherId,
      filename: file.name,
      mimeType: mime,
      bytes,
    });
    return c.json({ document }, 201);
  } catch (err) {
    ctx.logger.error({ err }, 'échec ingestion document');
    return c.json({ error: 'Impossible d’analyser ce document.' }, 422);
  }
}

/**
 * Gestion des documents (RAG). Deux points d'attache :
 *  - **un Cadre** (bibliothèque réutilisable) ;
 *  - **une conversation** (dépôt ponctuel dans le chat).
 * Verrouillé sur l'enseignant courant.
 */
export function createDocumentsRoute(ctx: AppContext): Hono {
  const route = new Hono();

  // --- Documents d'un Cadre ---
  route.get('/api/frameworks/:id/documents', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    if (!(await getFramework(ctx.db, id, teacher.id))) {
      return c.json({ error: 'Cadre introuvable.' }, 404);
    }
    return c.json({ documents: await listFrameworkDocuments(ctx.db, id) });
  });

  route.post('/api/frameworks/:id/documents', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Cadre introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    if (!(await getFramework(ctx.db, id, teacher.id))) {
      return c.json({ error: 'Cadre introuvable.' }, 404);
    }
    return handleUpload(ctx, c, { frameworkId: id }, teacher.id);
  });

  // --- Documents d'une conversation (dépôt dans le chat) ---
  route.get('/api/conversations/:id/documents', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    if (!(await getConversation(ctx.db, id, teacher.id))) {
      return c.json({ error: 'Conversation introuvable.' }, 404);
    }
    return c.json({ documents: await listConversationDocuments(ctx.db, id) });
  });

  route.post('/api/conversations/:id/documents', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Conversation introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    if (!(await getConversation(ctx.db, id, teacher.id))) {
      return c.json({ error: 'Conversation introuvable.' }, 404);
    }
    return handleUpload(ctx, c, { conversationId: id }, teacher.id);
  });

  route.delete('/api/documents/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'Document introuvable.' }, 404);
    const teacher = await ctx.auth.getCurrentTeacher(c);
    const ok = await deleteDocument(ctx.db, id, teacher.id);
    if (!ok) return c.json({ error: 'Document introuvable.' }, 404);
    return c.body(null, 204);
  });

  return route;
}
