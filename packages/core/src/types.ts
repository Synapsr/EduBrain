import type { ModelTier } from './constants';

/** Rôles de message conformes à l'AI SDK. */
export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * Profil enseignant (auth mockée en MVP). Aucune donnée d'élève. On garde le
 * minimum nécessaire (minimisation RGPD).
 */
export interface Teacher {
  id: string;
  displayName: string;
  email: string;
  createdAt: Date;
}

/** Métadonnées de conversation (le détail des messages vit en base). */
export interface ConversationSummary {
  id: string;
  title: string;
  modelTier: ModelTier;
  frameworkId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Réponse de l'endpoint /health de l'API. */
export interface HealthStatus {
  status: 'ok';
  service: 'edubrain-api';
  version: string;
  /** Vrai si aucune clé Albert n'est configurée (provider mock actif). */
  demoMode: boolean;
  /** Connexion base de données joignable. */
  database: 'up' | 'down' | 'unknown';
  timestamp: string;
}
