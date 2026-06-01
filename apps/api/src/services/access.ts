import { randomBytes } from 'node:crypto';
import {
  type AccessRow,
  accesses,
  type Conversation,
  conversations,
  type Database,
  frameworks,
  students,
} from '@edubrain/db';
import { and, asc, count, desc, eq, isNotNull } from 'drizzle-orm';

export interface StudentDTO {
  id: string;
  displayName: string;
}

export interface AccessSummary {
  id: string;
  name: string;
  token: string;
  active: boolean;
  framework: { id: string; name: string };
  studentCount: number;
  createdAt: Date;
}

export interface AccessDetail {
  id: string;
  name: string;
  token: string;
  active: boolean;
  framework: { id: string; name: string };
  createdAt: Date;
  students: Array<StudentDTO & { conversationCount: number }>;
}

/** Accès tel que vu par l'élève (via le token du lien). */
export interface StudentAccessInfo {
  accessId: string;
  name: string;
  frameworkName: string;
  students: StudentDTO[];
}

function generateToken(): string {
  return randomBytes(9).toString('base64url');
}

export async function createAccess(
  db: Database,
  teacherId: string,
  input: { frameworkId: string; name: string; studentNames: string[] },
): Promise<AccessSummary> {
  // Vérifie que le Cadre appartient à l'enseignant.
  const fw = await db
    .select({ id: frameworks.id, name: frameworks.name })
    .from(frameworks)
    .where(and(eq(frameworks.id, input.frameworkId), eq(frameworks.teacherId, teacherId)))
    .limit(1);
  const framework = fw[0];
  if (!framework) throw new Error('Cadre introuvable.');

  const names = input.studentNames.map((n) => n.trim()).filter(Boolean);

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(accesses)
      .values({
        teacherId,
        frameworkId: input.frameworkId,
        name: input.name,
        token: generateToken(),
      })
      .returning();
    const access = inserted[0];
    if (!access) throw new Error('Échec de la création de l’accès.');

    if (names.length > 0) {
      await tx
        .insert(students)
        .values(names.map((displayName) => ({ accessId: access.id, displayName })));
    }
    return {
      id: access.id,
      name: access.name,
      token: access.token,
      active: access.active,
      framework,
      studentCount: names.length,
      createdAt: access.createdAt,
    };
  });
}

export async function listAccesses(db: Database, teacherId: string): Promise<AccessSummary[]> {
  const rows = await db
    .select({
      id: accesses.id,
      name: accesses.name,
      token: accesses.token,
      active: accesses.active,
      createdAt: accesses.createdAt,
      frameworkId: frameworks.id,
      frameworkName: frameworks.name,
      studentCount: count(students.id),
    })
    .from(accesses)
    .innerJoin(frameworks, eq(accesses.frameworkId, frameworks.id))
    .leftJoin(students, eq(students.accessId, accesses.id))
    .where(eq(accesses.teacherId, teacherId))
    .groupBy(accesses.id, frameworks.id)
    .orderBy(desc(accesses.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    token: row.token,
    active: row.active,
    framework: { id: row.frameworkId, name: row.frameworkName },
    studentCount: Number(row.studentCount),
    createdAt: row.createdAt,
  }));
}

async function ownedAccess(db: Database, id: string, teacherId: string): Promise<AccessRow | null> {
  const rows = await db
    .select()
    .from(accesses)
    .where(and(eq(accesses.id, id), eq(accesses.teacherId, teacherId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAccessDetail(
  db: Database,
  id: string,
  teacherId: string,
): Promise<AccessDetail | null> {
  const access = await ownedAccess(db, id, teacherId);
  if (!access) return null;
  const fw = await db
    .select({ id: frameworks.id, name: frameworks.name })
    .from(frameworks)
    .where(eq(frameworks.id, access.frameworkId))
    .limit(1);

  const roster = await db
    .select({
      id: students.id,
      displayName: students.displayName,
      conversationCount: count(conversations.id),
    })
    .from(students)
    .leftJoin(conversations, eq(conversations.studentId, students.id))
    .where(eq(students.accessId, id))
    .groupBy(students.id)
    .orderBy(asc(students.createdAt));

  return {
    id: access.id,
    name: access.name,
    token: access.token,
    active: access.active,
    framework: fw[0] ?? { id: access.frameworkId, name: '—' },
    createdAt: access.createdAt,
    students: roster.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      conversationCount: Number(s.conversationCount),
    })),
  };
}

export async function renameAccess(
  db: Database,
  id: string,
  teacherId: string,
  name: string,
): Promise<boolean> {
  const rows = await db
    .update(accesses)
    .set({ name })
    .where(and(eq(accesses.id, id), eq(accesses.teacherId, teacherId)))
    .returning({ id: accesses.id });
  return rows.length > 0;
}

/** (Dés)active un espace. Désactivé ⇒ lien élève coupé, échanges conservés. */
export async function setAccessActive(
  db: Database,
  id: string,
  teacherId: string,
  active: boolean,
): Promise<boolean> {
  const rows = await db
    .update(accesses)
    .set({ active })
    .where(and(eq(accesses.id, id), eq(accesses.teacherId, teacherId)))
    .returning({ id: accesses.id });
  return rows.length > 0;
}

export async function deleteAccess(db: Database, id: string, teacherId: string): Promise<boolean> {
  const rows = await db
    .delete(accesses)
    .where(and(eq(accesses.id, id), eq(accesses.teacherId, teacherId)))
    .returning({ id: accesses.id });
  return rows.length > 0;
}

export async function addStudent(
  db: Database,
  accessId: string,
  teacherId: string,
  displayName: string,
): Promise<StudentDTO | null> {
  if (!(await ownedAccess(db, accessId, teacherId))) return null;
  const rows = await db
    .insert(students)
    .values({ accessId, displayName })
    .returning({ id: students.id, displayName: students.displayName });
  return rows[0] ?? null;
}

export async function removeStudent(
  db: Database,
  studentId: string,
  teacherId: string,
): Promise<boolean> {
  // Vérifie via jointure que l'élève appartient à un accès de l'enseignant.
  const owned = await db
    .select({ id: students.id })
    .from(students)
    .innerJoin(accesses, eq(students.accessId, accesses.id))
    .where(and(eq(students.id, studentId), eq(accesses.teacherId, teacherId)))
    .limit(1);
  if (!owned[0]) return false;
  await db.delete(students).where(eq(students.id, studentId));
  return true;
}

// --- Côté élève (via token) -------------------------------------------------

export async function getAccessByToken(
  db: Database,
  token: string,
): Promise<(StudentAccessInfo & { teacherId: string; frameworkId: string }) | null> {
  const rows = await db
    .select({
      id: accesses.id,
      name: accesses.name,
      teacherId: accesses.teacherId,
      frameworkId: accesses.frameworkId,
      frameworkName: frameworks.name,
    })
    .from(accesses)
    .innerJoin(frameworks, eq(accesses.frameworkId, frameworks.id))
    .where(and(eq(accesses.token, token), eq(accesses.active, true)))
    .limit(1);
  const access = rows[0];
  if (!access) return null;

  const roster = await db
    .select({ id: students.id, displayName: students.displayName })
    .from(students)
    .where(eq(students.accessId, access.id))
    .orderBy(asc(students.createdAt));

  return {
    accessId: access.id,
    name: access.name,
    frameworkName: access.frameworkName,
    teacherId: access.teacherId,
    frameworkId: access.frameworkId,
    students: roster,
  };
}

export async function studentInAccess(
  db: Database,
  accessId: string,
  studentId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.accessId, accessId)))
    .limit(1);
  return rows.length > 0;
}

export interface StudentConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

function toStudentSummary(row: Conversation): StudentConversationSummary {
  return { id: row.id, title: row.title, updatedAt: row.updatedAt };
}

export async function listStudentConversations(
  db: Database,
  accessId: string,
  studentId: string,
): Promise<StudentConversationSummary[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.accessId, accessId), eq(conversations.studentId, studentId)))
    .orderBy(desc(conversations.updatedAt));
  return rows.map(toStudentSummary);
}

export async function createStudentConversation(
  db: Database,
  access: { id: string; teacherId: string; frameworkId: string },
  studentId: string,
): Promise<StudentConversationSummary> {
  const rows = await db
    .insert(conversations)
    .values({
      teacherId: access.teacherId,
      frameworkId: access.frameworkId,
      accessId: access.id,
      studentId,
      modelTier: 'small',
    })
    .returning();
  const created = rows[0];
  if (!created) throw new Error('Échec de la création de la conversation.');
  return toStudentSummary(created);
}

export async function getStudentConversation(
  db: Database,
  conversationId: string,
  accessId: string,
  studentId: string,
): Promise<Conversation | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.accessId, accessId),
        eq(conversations.studentId, studentId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Conversations d'un élève (pour la supervision enseignant). Vérifie la propriété. */
export async function teacherStudentConversations(
  db: Database,
  studentId: string,
  teacherId: string,
): Promise<StudentConversationSummary[] | null> {
  const owned = await db
    .select({ id: students.id, accessId: students.accessId })
    .from(students)
    .innerJoin(accesses, eq(students.accessId, accesses.id))
    .where(and(eq(students.id, studentId), eq(accesses.teacherId, teacherId)))
    .limit(1);
  const student = owned[0];
  if (!student) return null;
  return listStudentConversations(db, student.accessId, studentId);
}

/** L'enseignant peut-il lire cette conversation d'élève (supervision) ? */
export async function teacherOwnsStudentConversation(
  db: Database,
  conversationId: string,
  teacherId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.teacherId, teacherId),
        isNotNull(conversations.studentId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
