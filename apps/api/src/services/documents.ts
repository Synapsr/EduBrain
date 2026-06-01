import { chunkText } from '@edubrain/core/rag';
import { chunks, type Database, type DocumentRow, documents } from '@edubrain/db';
import { and, asc, cosineDistance, eq, or, type SQL } from 'drizzle-orm';
import type { Embedder } from '../rag/embed';
import { extractText } from '../rag/extract';

export interface DocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: Date;
}

export interface RetrievedChunk {
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
}

/** Cible d'un document : un Cadre (réutilisable) ou une conversation (ponctuel). */
export type DocumentTarget =
  | { frameworkId: string; conversationId?: undefined }
  | { conversationId: string; frameworkId?: undefined };

function toSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    chunkCount: row.chunkCount,
    createdAt: row.createdAt,
  };
}

/**
 * Ingestion d'un document : extraction → découpage → embeddings → stockage
 * (document + chunks) dans une transaction. Rattaché à un Cadre OU une conversation.
 */
export async function ingestDocument(
  db: Database,
  embedder: Embedder,
  input: DocumentTarget & {
    teacherId: string;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  },
): Promise<DocumentSummary> {
  // Taille capturée AVANT extraction : l'extraction PDF (unpdf/pdf.js) peut
  // « détacher » l'ArrayBuffer sous-jacent (⇒ `bytes.length` retomberait à 0).
  const sizeBytes = input.bytes.byteLength;
  const text = await extractText(input.bytes, input.mimeType);
  const pieces = chunkText(text);
  const embeddings = pieces.length > 0 ? await embedder.embed(pieces) : [];
  const frameworkId = input.frameworkId ?? null;
  const conversationId = input.conversationId ?? null;

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(documents)
      .values({
        frameworkId,
        conversationId,
        teacherId: input.teacherId,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes,
        chunkCount: pieces.length,
      })
      .returning();
    const doc = inserted[0];
    if (!doc) throw new Error('Échec de la création du document.');

    if (pieces.length > 0) {
      await tx.insert(chunks).values(
        pieces.map((content, index) => ({
          documentId: doc.id,
          frameworkId,
          conversationId,
          content,
          embedding: embeddings[index] ?? [],
          position: index,
        })),
      );
    }
    return toSummary(doc);
  });
}

export async function listFrameworkDocuments(
  db: Database,
  frameworkId: string,
): Promise<DocumentSummary[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.frameworkId, frameworkId))
    .orderBy(asc(documents.createdAt));
  return rows.map(toSummary);
}

export async function listConversationDocuments(
  db: Database,
  conversationId: string,
): Promise<DocumentSummary[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.conversationId, conversationId))
    .orderBy(asc(documents.createdAt));
  return rows.map(toSummary);
}

export async function deleteDocument(
  db: Database,
  id: string,
  teacherId: string,
): Promise<boolean> {
  const rows = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.teacherId, teacherId)))
    .returning({ id: documents.id });
  return rows.length > 0;
}

/**
 * Récupère les `k` passages les plus proches de `query` parmi les documents de
 * la conversation **et** ceux de son Cadre (distance cosinus pgvector, index
 * HNSW). Filtre sur un seuil minimal de similarité.
 */
export async function retrieveChunks(
  db: Database,
  embedder: Embedder,
  scope: { conversationId?: string; frameworkId?: string | null },
  query: string,
  k: number,
  minSimilarity: number,
): Promise<RetrievedChunk[]> {
  const scopeFilters: SQL[] = [];
  if (scope.conversationId) {
    scopeFilters.push(eq(chunks.conversationId, scope.conversationId));
  }
  if (scope.frameworkId) {
    scopeFilters.push(eq(chunks.frameworkId, scope.frameworkId));
  }
  if (scopeFilters.length === 0) return [];

  const queryEmbedding = (await embedder.embed([query]))[0];
  if (!queryEmbedding) return [];

  const distance = cosineDistance(chunks.embedding, queryEmbedding);
  const where = scopeFilters.length === 1 ? scopeFilters[0] : or(...scopeFilters);
  const rows = await db
    .select({
      documentId: chunks.documentId,
      filename: documents.filename,
      content: chunks.content,
      distance,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(where)
    .orderBy(distance)
    .limit(k);

  return rows
    .map((row) => ({
      documentId: row.documentId,
      filename: row.filename,
      content: row.content,
      similarity: 1 - Number(row.distance),
    }))
    .filter((row) => row.similarity >= minSimilarity);
}
