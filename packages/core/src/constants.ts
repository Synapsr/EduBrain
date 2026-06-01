/** Métadonnées applicatives partagées. */
export const APP_NAME = 'EduBrain' as const;
export const APP_TAGLINE = 'Assistant IA souverain pour les enseignants' as const;

/**
 * Paliers de modèle exposés à l'enseignant. `small` est le défaut (frugalité) ;
 * `large` est réservé aux tâches complexes. Les identifiants concrets sont
 * résolus côté serveur depuis l'environnement (`ALBERT_CHAT_MODEL_*`).
 */
export const MODEL_TIERS = ['small', 'large'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];
export const DEFAULT_MODEL_TIER: ModelTier = 'small';

/** Identifiant du provider mock (mode démo, sans clé Albert). */
export const DEMO_PROVIDER_ID = 'echo' as const;
export const DEMO_MODEL_ID = 'echo-demo' as const;

/** Limites d'upload pour le RAG (sanitation — durcies en M3/M5). */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
export const UPLOAD_ALLOWED_MIME = ['application/pdf', 'text/plain', 'text/markdown'] as const;
export type AllowedUploadMime = (typeof UPLOAD_ALLOWED_MIME)[number];
