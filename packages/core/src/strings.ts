/**
 * Chaînes d'interface **centralisées en français**. Source unique de vérité,
 * prête pour une future internationalisation (i18n) : remplacer cet objet par
 * un dictionnaire chargé par locale sans toucher aux composants.
 *
 * Interface en français (exigence produit) — diacritiques inclus (é è à ç œ…).
 */
export const fr = {
  app: {
    name: 'EduBrain',
    tagline: 'Assistant IA souverain pour les enseignants',
    demoBanner: 'Mode démo : aucune clé Albert configurée. Les réponses sont simulées localement.',
  },
  common: {
    retry: 'Réessayer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    loading: 'Chargement…',
    send: 'Envoyer',
    stop: 'Arrêter',
  },
  health: {
    checking: 'Vérification de la connexion à l’API…',
    ok: 'API connectée',
    down: 'API injoignable',
  },
  errors: {
    generic: 'Une erreur est survenue. Veuillez réessayer.',
    network: 'Connexion au service impossible. Vérifiez votre réseau.',
    rateLimited: 'Trop de requêtes. Patientez un instant avant de réessayer.',
    albertUnavailable: 'Le service Albert est momentanément indisponible.',
    timeout: 'Le service a mis trop de temps à répondre.',
  },
} as const;

export type FrStrings = typeof fr;
