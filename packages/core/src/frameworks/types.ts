/** Visibilité d'un Cadre : privé (par défaut) ou partageable. */
export const FRAMEWORK_VISIBILITIES = ['private', 'shared'] as const;
export type FrameworkVisibility = (typeof FRAMEWORK_VISIBILITIES)[number];

/**
 * Configuration d'un **Cadre d'usage** — la fonctionnalité centrale. C'est ce
 * que l'enseignant définit pour encadrer l'assistant ; cela **compile** en un
 * system prompt + des garde-fous (voir {@link compileFramework}). Le RAG (M3)
 * branchera ses documents sur ce même objet.
 */
export interface FrameworkConfig {
  /** Nom du Cadre. */
  name: string;
  /** Description courte (intention). */
  description: string;
  /** Matière. */
  subject: string;
  /** Niveau (classe / cycle). */
  level: string;
  /** Champ libre : lien programmes / CRCN. */
  programLink: string;
  /** Rôle / persona de l'assistant. */
  persona: string;
  /** Ton attendu. */
  tone: string;
  /** Ce que l'assistant DOIT faire (règles explicites). */
  doRules: string[];
  /** Ce que l'assistant NE DOIT PAS faire (garde-fous). */
  dontRules: string[];
}

/** Cadre persisté (configuration + métadonnées). */
export interface Framework extends FrameworkConfig {
  id: string;
  visibility: FrameworkVisibility;
  createdAt: Date;
  updatedAt: Date;
}

/** Résultat de la compilation d'un Cadre. */
export interface CompiledFramework {
  /** System prompt prêt pour `streamText`. */
  systemPrompt: string;
  /** Garde-fous structurés (utiles pour l'UI et de futurs contrôles). */
  guardrails: {
    do: string[];
    dont: string[];
  };
}
