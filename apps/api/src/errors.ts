import { APICallError } from '@ai-sdk/provider';
import { fr } from '@edubrain/core';

/**
 * Traduit une erreur d'appel IA en message **utilisateur en français**, avec
 * dégradation gracieuse (timeout, rate limit, indisponibilité Albert). Le
 * message est renvoyé dans le flux (onError) et affiché côté client.
 */
export function describeChatError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 429) return fr.errors.rateLimited;
    if (status === 408 || status === 504) return fr.errors.timeout;
    if (status !== undefined && status >= 500) return fr.errors.albertUnavailable;
    if (error.isRetryable) return fr.errors.albertUnavailable;
    return fr.errors.generic;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return fr.errors.timeout;
    if (error.message.toLowerCase().includes('fetch')) return fr.errors.network;
  }

  return fr.errors.generic;
}
