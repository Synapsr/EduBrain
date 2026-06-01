import type { ModelTier } from '@edubrain/core';
import { type Conversation, conversations, type Database, messages } from '@edubrain/db';
import type { UIMessage } from 'ai';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

const DEFAULT_TITLE = 'Nouvelle conversation';
const MAX_TITLE_LENGTH = 60;

export interface ConversationSummaryRow {
  id: string;
  title: string;
  modelTier: ModelTier;
  frameworkId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredMessageRow {
  id: string;
  role: string;
  parts: Array<Record<string, unknown>>;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

function toSummary(row: Conversation): ConversationSummaryRow {
  return {
    id: row.id,
    title: row.title,
    modelTier: row.modelTier as ModelTier,
    frameworkId: row.frameworkId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Concatène le texte des `parts` d'un message (ignore les parts non textuelles). */
export function extractText(parts: ReadonlyArray<{ type: string; text?: unknown }>): string {
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();
}

function deriveTitle(uiMessages: ReadonlyArray<UIMessage>): string | null {
  const firstUser = uiMessages.find((m) => m.role === 'user');
  if (!firstUser) return null;
  const text = extractText(firstUser.parts as Array<{ type: string; text?: unknown }>);
  if (!text) return null;
  const single = text.replace(/\s+/g, ' ');
  return single.length > MAX_TITLE_LENGTH
    ? `${single.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
    : single;
}

export async function listConversations(
  db: Database,
  teacherId: string,
): Promise<ConversationSummaryRow[]> {
  const rows = await db
    .select()
    .from(conversations)
    // Conversations propres de l'enseignant uniquement (pas celles des élèves).
    .where(and(eq(conversations.teacherId, teacherId), isNull(conversations.studentId)))
    .orderBy(desc(conversations.updatedAt));
  return rows.map(toSummary);
}

export async function getConversation(
  db: Database,
  id: string,
  teacherId: string,
): Promise<ConversationSummaryRow | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.teacherId, teacherId),
        isNull(conversations.studentId),
      ),
    )
    .limit(1);
  return rows[0] ? toSummary(rows[0]) : null;
}

export async function createConversation(
  db: Database,
  teacherId: string,
  input: { title?: string; modelTier?: ModelTier; frameworkId?: string | null },
): Promise<ConversationSummaryRow> {
  const rows = await db
    .insert(conversations)
    .values({
      teacherId,
      title: input.title ?? DEFAULT_TITLE,
      modelTier: input.modelTier ?? 'small',
      frameworkId: input.frameworkId ?? null,
    })
    .returning();
  const created = rows[0];
  if (!created) throw new Error('Échec de la création de la conversation.');
  return toSummary(created);
}

/** Met à jour une conversation : titre, Cadre appliqué (`frameworkId`), palier. */
export async function updateConversation(
  db: Database,
  id: string,
  teacherId: string,
  patch: { title?: string; frameworkId?: string | null; modelTier?: ModelTier },
): Promise<ConversationSummaryRow | null> {
  const updates: {
    title?: string;
    frameworkId?: string | null;
    modelTier?: ModelTier;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.frameworkId !== undefined) updates.frameworkId = patch.frameworkId;
  if (patch.modelTier !== undefined) updates.modelTier = patch.modelTier;

  const rows = await db
    .update(conversations)
    .set(updates)
    .where(and(eq(conversations.id, id), eq(conversations.teacherId, teacherId)))
    .returning();
  return rows[0] ? toSummary(rows[0]) : null;
}

export async function deleteConversation(
  db: Database,
  id: string,
  teacherId: string,
): Promise<boolean> {
  const rows = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.teacherId, teacherId)))
    .returning({ id: conversations.id });
  return rows.length > 0;
}

export async function getMessages(
  db: Database,
  conversationId: string,
): Promise<StoredMessageRow[]> {
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.position));
  return rows;
}

/**
 * Persiste un tour de conversation : upsert idempotent de tous les messages
 * (clé = id stable de l'AI SDK), met à jour `updatedAt`, et dérive un titre
 * depuis le premier message utilisateur si le titre est encore par défaut.
 */
export async function persistTurn(
  db: Database,
  conversationId: string,
  uiMessages: ReadonlyArray<UIMessage>,
): Promise<void> {
  if (uiMessages.length === 0) return;

  const rows = uiMessages.map((message, index) => ({
    id: message.id,
    conversationId,
    role: message.role,
    parts: message.parts as unknown as Array<Record<string, unknown>>,
    metadata: (message.metadata as Record<string, unknown> | undefined) ?? null,
    position: index,
  }));

  await db
    .insert(messages)
    .values(rows)
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        parts: sql`excluded.parts`,
        metadata: sql`excluded.metadata`,
        position: sql`excluded.position`,
        role: sql`excluded.role`,
      },
    });

  const title = deriveTitle(uiMessages);
  await db
    .update(conversations)
    .set({
      updatedAt: new Date(),
      ...(title
        ? {
            title: sql`CASE WHEN ${conversations.title} = ${DEFAULT_TITLE} THEN ${title} ELSE ${conversations.title} END`,
          }
        : {}),
    })
    .where(eq(conversations.id, conversationId));
}
