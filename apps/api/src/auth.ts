import { type Database, teachers } from '@edubrain/db';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';

export interface AuthenticatedTeacher {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Abstraction d'authentification. En MVP, implémentation **mockée** (un
 * enseignant « démo »). À remplacer par ÉduConnect / ProConnect en branchant
 * une implémentation qui lit la requête (`c`) — cookie de session, token SSO —
 * sans toucher au reste de l'application.
 */
export interface AuthProvider {
  /** Résout l'enseignant courant pour la requête. Lève si non authentifié. */
  getCurrentTeacher(c: Context): Promise<AuthenticatedTeacher>;
}

const DEMO_EMAIL = 'demo@edubrain.local';
const DEMO_NAME = 'Enseignant·e démo';

/**
 * Auth mockée : renvoie toujours l'enseignant démo (créé à la volée s'il
 * n'existe pas). Ignore la requête. Un modèle simple « enseignant → ses
 * conversations / cadres / documents » suffit pour le MVP.
 */
export class MockAuthProvider implements AuthProvider {
  constructor(private readonly db: Database) {}

  async getCurrentTeacher(_c: Context): Promise<AuthenticatedTeacher> {
    const existing = await this.db
      .select({ id: teachers.id, email: teachers.email, displayName: teachers.displayName })
      .from(teachers)
      .where(eq(teachers.email, DEMO_EMAIL))
      .limit(1);
    if (existing[0]) return existing[0];

    const inserted = await this.db
      .insert(teachers)
      .values({ email: DEMO_EMAIL, displayName: DEMO_NAME })
      .returning({ id: teachers.id, email: teachers.email, displayName: teachers.displayName });
    const created = inserted[0];
    if (!created) throw new Error('Impossible de créer l’enseignant démo.');
    return created;
  }
}
