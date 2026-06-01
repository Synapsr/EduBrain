import { Hono } from 'hono';
import type { AppContext } from '../context';
import { TRANSCRIBE_MAX_BYTES, transcribeAudio } from '../services/transcribe';

/**
 * `POST /api/transcribe` — dictée (parole → texte) via Albert Whisper. Multipart
 * (`file`). Indisponible en mode démo (pas de clé / pas de modèle).
 */
export function createTranscribeRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.post('/api/transcribe', async (c) => {
    if (ctx.demoMode || !ctx.env.ALBERT_TRANSCRIPTION_MODEL) {
      return c.json({ error: 'Dictée indisponible (mode démo).' }, 503);
    }
    await ctx.auth.getCurrentTeacher(c);

    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: 'Aucun audio fourni.' }, 400);
    if (!file.type.startsWith('audio/')) {
      return c.json({ error: 'Format audio non pris en charge.' }, 415);
    }
    if (file.size > TRANSCRIBE_MAX_BYTES) {
      const maxMo = Math.round(TRANSCRIBE_MAX_BYTES / 1024 / 1024);
      return c.json({ error: `Audio trop volumineux (max ${maxMo} Mo).` }, 413);
    }

    try {
      const { text } = await transcribeAudio(ctx.env, file);
      return c.json({ text });
    } catch (err) {
      ctx.logger.error({ err }, 'échec transcription');
      return c.json({ error: 'Transcription impossible. Réessayez.' }, 502);
    }
  });

  return route;
}
