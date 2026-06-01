import { describe, expect, it } from 'vitest';
import { cosineSimilarity, hashingEmbedding } from './embedding';

const DIM = 256;

describe('hashingEmbedding (mock)', () => {
  it('produit un vecteur normalisé de la bonne dimension', () => {
    const vec = hashingEmbedding('les fractions en CM1', DIM);
    expect(vec).toHaveLength(DIM);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('est déterministe', () => {
    expect(hashingEmbedding('photosynthèse', DIM)).toEqual(hashingEmbedding('photosynthèse', DIM));
  });

  it('similarité plus élevée pour des textes au vocabulaire partagé', () => {
    const query = hashingEmbedding('activité sur les fractions au CM1', DIM);
    const related = hashingEmbedding(
      'Voici une activité de fractions adaptée aux élèves de CM1.',
      DIM,
    );
    const unrelated = hashingEmbedding(
      'La conjugaison du passé composé en espagnol au lycée.',
      DIM,
    );
    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated));
  });
});

describe('cosineSimilarity', () => {
  it('vaut 1 pour des vecteurs identiques et 0 pour orthogonaux', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
});
