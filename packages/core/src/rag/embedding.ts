/**
 * Embedding **mock** (mode démo) : vectoriseur par hachage de sac-de-mots. Sans
 * sémantique profonde, mais la similarité cosinus reflète le **vocabulaire
 * partagé** — la récupération RAG fonctionne donc lexicalement, hors-ligne et
 * sans clé. Déterministe (testé).
 */

/** Retire les diacritiques et découpe en tokens (mots ≥ 2 caractères). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

/** Hachage déterministe FNV-1a (32 bits) → entier non signé. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Produit un vecteur d'embedding mock (sac-de-mots haché, normalisé L2). */
export function hashingEmbedding(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0);
  const bump = (index: number, weight: number) => {
    vec[index] = (vec[index] ?? 0) + weight;
  };
  for (const token of tokenize(text)) {
    bump(fnv1a(token) % dim, 1);
    // bigrammes de caractères pour un peu plus de signal
    for (let i = 0; i < token.length - 1; i++) {
      bump(fnv1a(token.slice(i, i + 2)) % dim, 0.5);
    }
  }
  let norm = 0;
  for (const value of vec) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vec.map((value) => value / norm);
}

/** Similarité cosinus entre deux vecteurs (suppose des longueurs égales). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
