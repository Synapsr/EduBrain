export interface ChunkOptions {
  /** Taille cible d'un chunk (caractères). */
  size?: number;
  /** Recouvrement entre chunks consécutifs (caractères). */
  overlap?: number;
}

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 150;

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Découpe en unités (phrases / paragraphes) pour des coupes propres. */
function splitUnits(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n{2,}/)
    .map((unit) => unit.trim())
    .filter(Boolean);
}

/**
 * Découpe un texte en chunks de ~`size` caractères avec un `overlap`. Coupe de
 * préférence aux frontières de phrases/paragraphes ; scinde durement les unités
 * trop longues. Fonction pure (testée) — base du RAG.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const size = options.size ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OVERLAP;
  const clean = normalize(text);
  if (!clean) return [];

  // Scinde d'abord les unités plus longues que `size`.
  const pieces: string[] = [];
  for (const unit of splitUnits(clean)) {
    if (unit.length <= size) {
      pieces.push(unit);
    } else {
      for (let i = 0; i < unit.length; i += size) pieces.push(unit.slice(i, i + size));
    }
  }

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length > size && current) {
      chunks.push(current);
      const tail = overlap > 0 ? current.slice(-overlap) : '';
      current = tail ? `${tail} ${piece}` : piece;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
