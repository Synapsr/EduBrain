import type { ModelTier } from '@edubrain/core';

/** Résumé de conversation tel que renvoyé par l'API (dates en ISO string). */
export interface ConversationSummary {
  id: string;
  title: string;
  modelTier: ModelTier;
  frameworkId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Part de message persistée (structure AI SDK ; on lit surtout le texte). */
export interface StoredMessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** Message persisté tel que renvoyé par l'API. */
export interface StoredMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: StoredMessagePart[];
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

/** Document (RAG) rattaché à un Cadre. */
export interface DocumentDTO {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
}

/** Source citée renvoyée dans les métadonnées d'un message assistant. */
export interface ChatSource {
  index: number;
  documentId: string;
  filename: string;
  snippet: string;
}

/** Accès élève (résumé) côté enseignant. */
export interface AccessDTO {
  id: string;
  name: string;
  token: string;
  active: boolean;
  framework: { id: string; name: string };
  studentCount: number;
  createdAt: string;
}

export interface AccessStudentDTO {
  id: string;
  displayName: string;
  conversationCount: number;
}

/** Détail d'un accès (avec roster + comptes de conversations). */
export interface AccessDetailDTO {
  id: string;
  name: string;
  token: string;
  active: boolean;
  framework: { id: string; name: string };
  createdAt: string;
  students: AccessStudentDTO[];
}

/** Accès vu par l'élève (via le token). */
export interface StudentAccessInfo {
  name: string;
  frameworkName: string;
  students: Array<{ id: string; displayName: string }>;
}

export interface StudentConversationDTO {
  id: string;
  title: string;
  updatedAt: string;
}

/** Cadre d'usage tel que renvoyé par l'API (dates en ISO string). */
export interface FrameworkDTO {
  id: string;
  name: string;
  description: string;
  subject: string;
  level: string;
  programLink: string;
  persona: string;
  tone: string;
  doRules: string[];
  dontRules: string[];
  visibility: 'private' | 'shared';
  createdAt: string;
  updatedAt: string;
}
