import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from './chat';

const UUID = '07ef3e9f-473b-45ad-a609-3b824ec94299';
const userMessage = { id: 'm1', role: 'user' as const, parts: [{ type: 'text', text: 'Bonjour' }] };

describe('chatRequestSchema', () => {
  it('accepte une requête valide et applique le palier "small" par défaut', () => {
    const result = chatRequestSchema.safeParse({ conversationId: UUID, messages: [userMessage] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.modelTier).toBe('small');
  });

  it('rejette un conversationId non-UUID', () => {
    const result = chatRequestSchema.safeParse({ conversationId: 'x', messages: [userMessage] });
    expect(result.success).toBe(false);
  });

  it('rejette une liste de messages vide', () => {
    expect(chatRequestSchema.safeParse({ conversationId: UUID, messages: [] }).success).toBe(false);
  });

  it('rejette un palier de modèle inconnu', () => {
    const result = chatRequestSchema.safeParse({
      conversationId: UUID,
      messages: [userMessage],
      modelTier: 'xl',
    });
    expect(result.success).toBe(false);
  });

  it('accepte un palier "large" explicite', () => {
    const result = chatRequestSchema.safeParse({
      conversationId: UUID,
      messages: [userMessage],
      modelTier: 'large',
    });
    expect(result.success).toBe(true);
  });
});
