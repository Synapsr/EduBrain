import type { ServerEnv } from '@edubrain/core/env';
import { hashingEmbedding } from '@edubrain/core/rag';
import { embedMany } from 'ai';
import { createAlbert } from '../providers/albert';

export interface Embedder {
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Construit le service d'embedding :
 *  - **mode démo** ⇒ vectoriseur mock par hachage (lexical, hors-ligne) ;
 *  - sinon ⇒ Albert / endpoint OpenAI-compatible via `embedMany`.
 * La dimension est vérifiée pour correspondre à la colonne pgvector.
 */
export function createEmbedder(env: ServerEnv, demoMode: boolean): Embedder {
  const dim = env.ALBERT_EMBEDDING_DIM;

  if (demoMode) {
    return {
      dim,
      embed: (texts) => Promise.resolve(texts.map((text) => hashingEmbedding(text, dim))),
    };
  }

  const model = createAlbert(env).textEmbeddingModel(env.ALBERT_EMBEDDING_MODEL);
  return {
    dim,
    async embed(texts) {
      if (texts.length === 0) return [];
      const { embeddings } = await embedMany({ model, values: texts });
      for (const embedding of embeddings) {
        if (embedding.length !== dim) {
          throw new Error(
            `Dimension d'embedding inattendue (${embedding.length} ≠ ${dim}). ` +
              'Ajustez ALBERT_EMBEDDING_DIM et régénérez la migration `chunks`.',
          );
        }
      }
      return embeddings;
    },
  };
}
