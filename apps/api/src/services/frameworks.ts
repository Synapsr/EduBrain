import type {
  Framework,
  FrameworkInput,
  FrameworkUpdate,
  FrameworkVisibility,
} from '@edubrain/core/frameworks';
import { type Database, type FrameworkRow, frameworks } from '@edubrain/db';
import { and, desc, eq } from 'drizzle-orm';

function toFramework(row: FrameworkRow): Framework {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    subject: row.subject,
    level: row.level,
    programLink: row.programLink,
    persona: row.persona,
    tone: row.tone,
    doRules: row.doRules,
    dontRules: row.dontRules,
    visibility: row.visibility as FrameworkVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listFrameworks(db: Database, teacherId: string): Promise<Framework[]> {
  const rows = await db
    .select()
    .from(frameworks)
    .where(eq(frameworks.teacherId, teacherId))
    .orderBy(desc(frameworks.updatedAt));
  return rows.map(toFramework);
}

export async function getFramework(
  db: Database,
  id: string,
  teacherId: string,
): Promise<Framework | null> {
  const rows = await db
    .select()
    .from(frameworks)
    .where(and(eq(frameworks.id, id), eq(frameworks.teacherId, teacherId)))
    .limit(1);
  return rows[0] ? toFramework(rows[0]) : null;
}

export async function createFramework(
  db: Database,
  teacherId: string,
  input: FrameworkInput,
): Promise<Framework> {
  const rows = await db
    .insert(frameworks)
    .values({ ...input, teacherId })
    .returning();
  const created = rows[0];
  if (!created) throw new Error('Échec de la création du Cadre.');
  return toFramework(created);
}

export async function updateFramework(
  db: Database,
  id: string,
  teacherId: string,
  patch: FrameworkUpdate,
): Promise<Framework | null> {
  const rows = await db
    .update(frameworks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(frameworks.id, id), eq(frameworks.teacherId, teacherId)))
    .returning();
  return rows[0] ? toFramework(rows[0]) : null;
}

export async function deleteFramework(
  db: Database,
  id: string,
  teacherId: string,
): Promise<boolean> {
  const rows = await db
    .delete(frameworks)
    .where(and(eq(frameworks.id, id), eq(frameworks.teacherId, teacherId)))
    .returning({ id: frameworks.id });
  return rows.length > 0;
}

/** Duplique un Cadre (partage par duplication) sous « … (copie) ». */
export async function duplicateFramework(
  db: Database,
  id: string,
  teacherId: string,
): Promise<Framework | null> {
  const source = await getFramework(db, id, teacherId);
  if (!source) return null;
  return createFramework(db, teacherId, {
    name: `${source.name} (copie)`,
    description: source.description,
    subject: source.subject,
    level: source.level,
    programLink: source.programLink,
    persona: source.persona,
    tone: source.tone,
    doRules: source.doRules,
    dontRules: source.dontRules,
    visibility: source.visibility,
  });
}
