import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

/**
 * Dimension des vecteurs d'embedding (= taille de la colonne pgvector).
 * Lue depuis l'environnement (défaut 1536). La colonne `vector(N)` est figée à
 * la migration : changer cette valeur impose de régénérer la migration `chunks`.
 */
const EMBEDDING_DIM = Number(process.env.ALBERT_EMBEDDING_DIM ?? 1024);

/**
 * Schéma de base de données EduBrain (Drizzle).
 *
 * Convention : casse `snake_case` en base (configurée via `casing` dans le
 * client et `drizzle.config.ts`), camelCase côté TypeScript.
 *
 * Le schéma grandit jalon par jalon :
 *  - M0 : `teachers` (auth mockée — un enseignant « démo »).
 *  - M1 : `conversations` / `messages`.
 *  - M2 : `frameworks` (Cadres d'usage).
 *  - M3 : `documents` / `chunks` (pgvector).
 */

/**
 * Enseignant. Auth mockée en MVP (pas de SSO réel). Aucune donnée d'élève ;
 * minimisation RGPD — on ne stocke que l'identité strictement nécessaire.
 */
export const teachers = pgTable('teachers', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Cadre d'usage — configuration nommée et réutilisable qui encadre l'assistant.
 * Compile en system prompt + garde-fous (cf. `@edubrain/core/frameworks`).
 * `doRules` / `dontRules` : listes de règles stockées en jsonb.
 */
export const frameworks = pgTable(
  'frameworks',
  {
    id: uuid().primaryKey().defaultRandom(),
    teacherId: uuid()
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    subject: text().notNull().default(''),
    level: text().notNull().default(''),
    programLink: text().notNull().default(''),
    persona: text().notNull().default(''),
    tone: text().notNull().default(''),
    doRules: jsonb().$type<string[]>().notNull().default([]),
    dontRules: jsonb().$type<string[]>().notNull().default([]),
    visibility: text().notNull().default('private'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('frameworks_teacher_idx').on(table.teacherId, table.updatedAt)],
);

/**
 * Conversation de chat appartenant à un enseignant.
 * `modelTier` : palier de modèle utilisé ('small' par défaut, frugalité).
 * `frameworkId` : Cadre d'usage appliqué (mis à NULL si le Cadre est supprimé).
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey().defaultRandom(),
    teacherId: uuid()
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    title: text().notNull().default('Nouvelle conversation'),
    modelTier: text().notNull().default('small'),
    frameworkId: uuid().references(() => frameworks.id, { onDelete: 'set null' }),
    // Conversation d'élève (accès élève) : sinon NULL = conversation de l'enseignant.
    accessId: uuid().references(() => accesses.id, { onDelete: 'cascade' }),
    studentId: uuid().references(() => students.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversations_teacher_idx').on(table.teacherId, table.updatedAt),
    index('conversations_student_idx').on(table.studentId, table.updatedAt),
  ],
);

/**
 * Accès élève (préfiguration de la phase 2) : un Cadre partagé à un groupe via
 * un lien. **Données fictives uniquement** (aucune donnée personnelle d'élève).
 * Le `token` est le secret du lien `/e/<token>` (auth mockée).
 */
export const accesses = pgTable(
  'accesses',
  {
    id: uuid().primaryKey().defaultRandom(),
    teacherId: uuid()
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    frameworkId: uuid()
      .notNull()
      .references(() => frameworks.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    token: text().notNull().unique(),
    /** Espace actif : si `false`, le lien élève est désactivé (échanges conservés). */
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('accesses_teacher_idx').on(table.teacherId)],
);

/** Élève **fictif** d'un accès (roster). Aucune donnée réelle. */
export const students = pgTable(
  'students',
  {
    id: uuid().primaryKey().defaultRandom(),
    accessId: uuid()
      .notNull()
      .references(() => accesses.id, { onDelete: 'cascade' }),
    displayName: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('students_access_idx').on(table.accessId)],
);

/**
 * Message d'une conversation. `id` = identifiant stable fourni par l'AI SDK
 * (UIMessage.id), ce qui rend la persistance idempotente (upsert). `parts`
 * stocke la structure de message v5 (texte, et plus tard sources, etc.).
 * `position` préserve l'ordre d'affichage.
 */
export const messages = pgTable(
  'messages',
  {
    id: text().primaryKey(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text().notNull(),
    parts: jsonb().$type<Array<Record<string, unknown>>>().notNull(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    position: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_idx').on(table.conversationId, table.position)],
);

/**
 * Document déposé par l'enseignant et rattaché à un Cadre (RAG). On ne stocke
 * pas le binaire : seulement les métadonnées + le texte découpé en `chunks`.
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    // Un document est rattaché soit à un Cadre (bibliothèque réutilisable),
    // soit à une conversation (dépôt ponctuel dans le chat). Exactement un des deux.
    frameworkId: uuid().references(() => frameworks.id, { onDelete: 'cascade' }),
    conversationId: uuid().references(() => conversations.id, { onDelete: 'cascade' }),
    teacherId: uuid()
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    filename: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    chunkCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('documents_framework_idx').on(table.frameworkId),
    index('documents_conversation_idx').on(table.conversationId),
  ],
);

/**
 * Fragment de document avec son embedding (pgvector). `frameworkId` /
 * `conversationId` sont dénormalisés pour filtrer rapidement la récupération.
 */
export const chunks = pgTable(
  'chunks',
  {
    id: uuid().primaryKey().defaultRandom(),
    documentId: uuid()
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    frameworkId: uuid().references(() => frameworks.id, { onDelete: 'cascade' }),
    conversationId: uuid().references(() => conversations.id, { onDelete: 'cascade' }),
    content: text().notNull(),
    embedding: vector({ dimensions: EMBEDDING_DIM }).notNull(),
    position: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chunks_framework_idx').on(table.frameworkId),
    index('chunks_conversation_idx').on(table.conversationId),
    // Index ANN HNSW pour la distance cosinus (<=>).
    index('chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export const frameworksRelations = relations(frameworks, ({ one, many }) => ({
  teacher: one(teachers, { fields: [frameworks.teacherId], references: [teachers.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  framework: one(frameworks, { fields: [documents.frameworkId], references: [frameworks.id] }),
  conversation: one(conversations, {
    fields: [documents.conversationId],
    references: [conversations.id],
  }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
}));

export const accessesRelations = relations(accesses, ({ one, many }) => ({
  teacher: one(teachers, { fields: [accesses.teacherId], references: [teachers.id] }),
  framework: one(frameworks, { fields: [accesses.frameworkId], references: [frameworks.id] }),
  students: many(students),
  conversations: many(conversations),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  access: one(accesses, { fields: [students.accessId], references: [accesses.id] }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  teacher: one(teachers, { fields: [conversations.teacherId], references: [teachers.id] }),
  framework: one(frameworks, {
    fields: [conversations.frameworkId],
    references: [frameworks.id],
  }),
  access: one(accesses, { fields: [conversations.accessId], references: [accesses.id] }),
  student: one(students, { fields: [conversations.studentId], references: [students.id] }),
  messages: many(messages),
  documents: many(documents),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type FrameworkRow = typeof frameworks.$inferSelect;
export type NewFrameworkRow = typeof frameworks.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
export type ChunkRow = typeof chunks.$inferSelect;
export type NewChunkRow = typeof chunks.$inferInsert;
export type AccessRow = typeof accesses.$inferSelect;
export type NewAccessRow = typeof accesses.$inferInsert;
export type StudentRow = typeof students.$inferSelect;
export type NewStudentRow = typeof students.$inferInsert;
