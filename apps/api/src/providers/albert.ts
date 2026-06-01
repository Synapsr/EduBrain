import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ServerEnv } from '@edubrain/core/env';

/**
 * Provider Albert (IA souveraine) via la compatibilité OpenAI. La clé reste
 * **strictement côté serveur**. Les identifiants de modèles sont fournis par
 * l'environnement (vérifiables via `GET /v1/models`).
 */
export function createAlbert(env: ServerEnv) {
  return createOpenAICompatible({
    name: 'albert',
    baseURL: env.ALBERT_BASE_URL,
    apiKey: env.ALBERT_API_KEY,
    includeUsage: true, // expose l'usage (tokens) sur le streaming
  });
}

export type AlbertProvider = ReturnType<typeof createAlbert>;
