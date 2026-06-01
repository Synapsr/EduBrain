import { z } from 'zod';

/**
 * Accès élève — préfiguration de la phase 2. Un Cadre partagé à un groupe via
 * un lien. **Données fictives uniquement** (aucune donnée personnelle d'élève) ;
 * auth mockée (le token du lien). Schémas de validation côté API et UI.
 */
export const createAccessSchema = z.object({
  frameworkId: z.uuid('Choisissez un Cadre.'),
  name: z.string().min(1, 'Donnez un nom (ex. « 6e B »).').max(120),
  studentNames: z.array(z.string().min(1).max(80)).max(60).default([]),
});
export type CreateAccessInput = z.infer<typeof createAccessSchema>;

export const renameAccessSchema = z.object({ name: z.string().min(1).max(120) });

/**
 * Mise à jour partielle d'un accès : renommer et/ou (dés)activer. Désactiver un
 * espace coupe le lien élève **sans supprimer les échanges** (conservés pour la
 * supervision).
 */
export const updateAccessSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.active !== undefined, {
    message: 'Aucune modification fournie.',
  });
export type UpdateAccessInput = z.infer<typeof updateAccessSchema>;

export const addStudentSchema = z.object({ displayName: z.string().min(1).max(80) });

/** Quelques prénoms fictifs pour amorcer un roster de démonstration. */
export const SAMPLE_STUDENT_NAMES = [
  'Léa Martin',
  'Hugo Bernard',
  'Inès Petit',
  'Noah Dubois',
  'Jade Moreau',
  'Sacha Lefebvre',
] as const;

/** Une classe fictive de l'établissement de démonstration. */
export interface DemoClass {
  /** Identifiant stable (usage UI uniquement). */
  id: string;
  /** Libellé de la classe (ex. « 6e B »). */
  name: string;
  /** Niveau, pour regrouper/afficher (ex. « 6e »). */
  level: string;
  /** Roster fictif de la classe. */
  students: readonly string[];
}

/** Nom de l'établissement fictif présenté dans le flux de création. */
export const DEMO_ESTABLISHMENT = 'Collège Jean-Moulin (démo)';

/**
 * Établissement **fictif** : plusieurs classes avec leurs élèves (prénoms
 * inventés). Sert uniquement à simuler la sélection d'une classe / d'un élève
 * lors de l'ouverture d'un accès. **Aucune donnée personnelle réelle.**
 */
export const DEMO_CLASSES: readonly DemoClass[] = [
  {
    id: '6eA',
    name: '6e A',
    level: '6e',
    students: [
      'Léa Martin',
      'Hugo Bernard',
      'Inès Petit',
      'Noah Dubois',
      'Jade Moreau',
      'Sacha Lefebvre',
      'Camille Roux',
      'Adam Fontaine',
    ],
  },
  {
    id: '6eB',
    name: '6e B',
    level: '6e',
    students: [
      'Manon Garnier',
      'Lucas Henry',
      'Chloé Faure',
      'Gabriel Mercier',
      'Louise Blanc',
      'Nathan Girard',
      'Emma Lambert',
    ],
  },
  {
    id: '5eC',
    name: '5e C',
    level: '5e',
    students: [
      'Tom Rousseau',
      'Anna Vincent',
      'Maël Bonnet',
      'Zoé Lemaire',
      'Raphaël Dupont',
      'Lina Caron',
      'Ethan Marchand',
      'Romane Gauthier',
    ],
  },
  {
    id: '4eB',
    name: '4e B',
    level: '4e',
    students: [
      'Jules Perrot',
      'Sarah Renard',
      'Théo Picard',
      'Alice Brun',
      'Maxime Roy',
      'Clara Noël',
    ],
  },
] as const;
