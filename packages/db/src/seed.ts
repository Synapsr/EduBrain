import { SAMPLE_STUDENT_NAMES } from '@edubrain/core/access';
import { loadRootEnv, parseServerEnv } from '@edubrain/core/env';
import { SEED_FRAMEWORKS } from '@edubrain/core/frameworks';
import { and, eq } from 'drizzle-orm';
import { createDb } from './client';
import { accesses, frameworks, students, teachers } from './schema';

/** Token du lien de démonstration `/e/demo` (auth mockée — données fictives). */
const DEMO_ACCESS_TOKEN = 'demo';

/**
 * Enseignant « démo » utilisé par l'auth mockée (un seul compte en MVP).
 * Aucune donnée réelle ; remplaçable par ÉduConnect/ProConnect plus tard.
 */
export const DEMO_TEACHER = {
  email: 'demo@edubrain.local',
  displayName: 'Enseignant·e démo',
} as const;

/**
 * Seed idempotent : l'enseignant démo + les 3 Cadres seedés (prépa de séance,
 * exercices différenciés, mode socratique). Les Cadres ne sont insérés que si
 * l'enseignant n'en a aucun (pour ne pas écraser ses modifications).
 */
async function main(): Promise<void> {
  loadRootEnv();
  const env = parseServerEnv();
  const db = createDb(env.DATABASE_URL, { max: 1 });

  const inserted = await db
    .insert(teachers)
    .values(DEMO_TEACHER)
    .onConflictDoNothing({ target: teachers.email })
    .returning({ id: teachers.id });

  const teacher =
    inserted[0] ??
    (
      await db
        .select({ id: teachers.id })
        .from(teachers)
        .where(eq(teachers.email, DEMO_TEACHER.email))
        .limit(1)
    )[0];

  if (!teacher) throw new Error('Enseignant démo introuvable après seed.');

  const existing = await db
    .select({ id: frameworks.id })
    .from(frameworks)
    .where(eq(frameworks.teacherId, teacher.id))
    .limit(1);

  if (existing.length === 0) {
    await db
      .insert(frameworks)
      .values(SEED_FRAMEWORKS.map((fw) => ({ ...fw, teacherId: teacher.id })));
    console.log(`[db] ${SEED_FRAMEWORKS.length} cadres seedés.`);
  } else {
    console.log('[db] cadres déjà présents — conservés.');
  }

  await seedDemoAccess(db, teacher.id);

  console.log(`[db] seed terminé (enseignant démo : ${DEMO_TEACHER.email}).`);
  process.exit(0);
}

/**
 * Espace élève de démonstration (données fictives) — préfigure la phase 2.
 * Idempotent via le token unique `demo` : crée « 6e B (démo) » sous le Cadre
 * « Mode socratique » avec un roster fictif, accessible sur `/e/demo`.
 */
async function seedDemoAccess(db: ReturnType<typeof createDb>, teacherId: string): Promise<void> {
  const socratic = (
    await db
      .select({ id: frameworks.id })
      .from(frameworks)
      .where(and(eq(frameworks.teacherId, teacherId), eq(frameworks.name, 'Mode socratique')))
      .limit(1)
  )[0];
  if (!socratic) return;

  const access = (
    await db
      .insert(accesses)
      .values({
        teacherId,
        frameworkId: socratic.id,
        name: '6e B (démo)',
        token: DEMO_ACCESS_TOKEN,
      })
      .onConflictDoNothing({ target: accesses.token })
      .returning({ id: accesses.id })
  )[0];

  if (!access) {
    console.log('[db] espace élève démo déjà présent — conservé.');
    return;
  }

  await db.insert(students).values(
    SAMPLE_STUDENT_NAMES.slice(0, 4).map((displayName) => ({
      accessId: access.id,
      displayName,
    })),
  );
  console.log(`[db] espace élève démo seedé (lien /e/${DEMO_ACCESS_TOKEN}).`);
}

main().catch((err) => {
  console.error('[db] échec du seed :', err);
  process.exit(1);
});
