import type { ServerEnv } from '@edubrain/core/env';

/** Taille max de l'audio dicté (~25 Mo, comme Whisper/OpenAI). */
export const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;

export interface TranscribeResult {
  text: string;
}

/**
 * Transcrit un fichier audio via Albert (Whisper, endpoint OpenAI-compatible
 * `/audio/transcriptions`). La clé reste **strictement côté serveur**. Langue
 * forcée au français (usage enseignant). Renvoie le texte nettoyé.
 */
export async function transcribeAudio(env: ServerEnv, file: File): Promise<TranscribeResult> {
  const model = env.ALBERT_TRANSCRIPTION_MODEL;
  if (!model || !env.ALBERT_API_KEY) {
    throw new Error('Transcription non configurée.');
  }

  const form = new FormData();
  form.append('model', model);
  form.append('language', 'fr');
  form.append('file', file, file.name || 'audio.webm');

  const res = await fetch(`${env.ALBERT_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.ALBERT_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription échouée (${res.status}).`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: (data.text ?? '').trim() };
}
