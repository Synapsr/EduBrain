import { z } from 'zod';
import { MODEL_TIERS } from './constants';

/**
 * Schémas de validation pour l'endpoint de chat (validation Zod sur la route —
 * exigence sécurité). Les `parts` des messages suivent la structure AI SDK 5 ;
 * on valide l'enveloppe strictement et les messages de façon permissive
 * (chaque part doit au moins porter un `type`).
 */
export const chatMessagePartSchema = z.object({ type: z.string() }).catchall(z.unknown());

export const chatUIMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['system', 'user', 'assistant']),
  parts: z.array(chatMessagePartSchema),
  metadata: z.unknown().optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatUIMessageSchema).min(1, 'Au moins un message est requis.'),
  conversationId: z.uuid('conversationId doit être un UUID.'),
  modelTier: z.enum(MODEL_TIERS).default('small'),
  frameworkId: z.uuid().nullish(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatUIMessageInput = z.infer<typeof chatUIMessageSchema>;
