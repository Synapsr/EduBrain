import { z } from 'zod';
import { FRAMEWORK_VISIBILITIES } from './types';

/** Schéma de validation d'un Cadre (création). Utilisé côté API et côté UI. */
export const frameworkInputSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.').max(120),
  description: z.string().max(600).default(''),
  subject: z.string().max(120).default(''),
  level: z.string().max(120).default(''),
  programLink: z.string().max(300).default(''),
  persona: z.string().max(400).default(''),
  tone: z.string().max(160).default(''),
  doRules: z.array(z.string().min(1).max(400)).max(30).default([]),
  dontRules: z.array(z.string().min(1).max(400)).max(30).default([]),
  visibility: z.enum(FRAMEWORK_VISIBILITIES).default('private'),
});

export type FrameworkInput = z.infer<typeof frameworkInputSchema>;

/** Schéma de mise à jour partielle. */
export const frameworkUpdateSchema = frameworkInputSchema.partial();
export type FrameworkUpdate = z.infer<typeof frameworkUpdateSchema>;
