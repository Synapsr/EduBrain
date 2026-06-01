import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

describe('chunkText', () => {
  it('renvoie un tableau vide pour un texte vide', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('renvoie un seul chunk pour un texte court', () => {
    const chunks = chunkText('Une phrase courte sur les fractions.', { size: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('fractions');
  });

  it('découpe un long texte en plusieurs chunks bornés', () => {
    const sentence = 'Les élèves manipulent des fractions concrètes en classe. ';
    const text = sentence.repeat(60); // ~3000+ caractères
    const chunks = chunkText(text, { size: 400, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // taille bornée (tolérance pour l'overlap et l'ajout d'une unité)
      expect(chunk.length).toBeLessThanOrEqual(400 + 100);
    }
  });

  it('introduit un recouvrement entre chunks consécutifs', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Phrase numero ${i} distincte.`).join(' ');
    const chunks = chunkText(text, { size: 200, overlap: 60 });
    expect(chunks.length).toBeGreaterThan(1);
    // le début du 2e chunk reprend la fin du 1er (overlap)
    const first = chunks[0] ?? '';
    const second = chunks[1] ?? '';
    const tail = first.slice(-20);
    expect(second.includes(tail.trim().split(' ')[0] ?? '')).toBe(true);
  });

  it('scinde durement une unité plus longue que la taille cible', () => {
    const huge = `${'a'.repeat(1200)}.`;
    const chunks = chunkText(huge, { size: 300, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(300);
  });
});
