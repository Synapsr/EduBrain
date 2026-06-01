export {
  type ChunkOptions,
  chunkText,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
} from './chunk';
export { cosineSimilarity, hashingEmbedding } from './embedding';

/** Nombre de passages récupérés et injectés dans le contexte. */
export const RAG_TOP_K = 4;
/** Similarité minimale pour retenir un passage (seuil bas, embedding lexical en démo). */
export const RAG_MIN_SIMILARITY = 0.04;
