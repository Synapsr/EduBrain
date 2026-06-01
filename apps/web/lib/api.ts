import type { ModelTier } from '@edubrain/core';
import type { FrameworkInput, FrameworkUpdate } from '@edubrain/core/frameworks';
import type {
  AccessDetailDTO,
  AccessDTO,
  ConversationSummary,
  DocumentDTO,
  FrameworkDTO,
  StoredMessage,
  StudentAccessInfo,
  StudentConversationDTO,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** Endpoint de chat (cible du transport `useChat`). */
export const CHAT_ENDPOINT = `${API_URL}/api/chat`;

/** Endpoint de chat élève (transport `useChat` côté espace élève). */
export const studentChatEndpoint = (token: string) => `${API_URL}/api/e/${token}/chat`;

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`);
  return res.json() as Promise<T>;
}

/** Dictée : envoie l'audio enregistré et renvoie sa transcription (Whisper). */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const ext = blob.type.includes('mp4')
    ? 'mp4'
    : blob.type.includes('ogg')
      ? 'ogg'
      : blob.type.includes('wav')
        ? 'wav'
        : 'webm';
  const form = new FormData();
  form.append('file', blob, `dictee.${ext}`);
  const res = await fetch(`${API_URL}/api/transcribe`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Transcription échouée (${res.status})`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function fetchDemoMode(signal?: AbortSignal): Promise<boolean> {
  const res = await fetch(`${API_URL}/health`, { signal });
  const data = await asJson<{ demoMode: boolean }>(res);
  return data.demoMode;
}

export async function listConversations(signal?: AbortSignal): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/api/conversations`, { signal });
  const data = await asJson<{ conversations: ConversationSummary[] }>(res);
  return data.conversations;
}

export async function createConversation(input: {
  modelTier?: ModelTier;
  frameworkId?: string | null;
}): Promise<ConversationSummary> {
  const res = await fetch(`${API_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await asJson<{ conversation: ConversationSummary }>(res);
  return data.conversation;
}

export async function loadConversation(
  id: string,
  signal?: AbortSignal,
): Promise<{ conversation: ConversationSummary; messages: StoredMessage[] }> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, { signal });
  return asJson(res);
}

export async function renameConversation(id: string, title: string): Promise<ConversationSummary> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const data = await asJson<{ conversation: ConversationSummary }>(res);
  return data.conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Suppression échouée (${res.status})`);
}

/** Applique (ou retire avec `null`) un Cadre à une conversation. */
export async function applyFramework(
  conversationId: string,
  frameworkId: string | null,
): Promise<ConversationSummary> {
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frameworkId }),
  });
  const data = await asJson<{ conversation: ConversationSummary }>(res);
  return data.conversation;
}

// --- Cadres d'usage ---------------------------------------------------------

export async function listFrameworks(signal?: AbortSignal): Promise<FrameworkDTO[]> {
  const res = await fetch(`${API_URL}/api/frameworks`, { signal });
  const data = await asJson<{ frameworks: FrameworkDTO[] }>(res);
  return data.frameworks;
}

export async function createFramework(input: FrameworkInput): Promise<FrameworkDTO> {
  const res = await fetch(`${API_URL}/api/frameworks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await asJson<{ framework: FrameworkDTO }>(res);
  return data.framework;
}

export async function updateFramework(id: string, patch: FrameworkUpdate): Promise<FrameworkDTO> {
  const res = await fetch(`${API_URL}/api/frameworks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await asJson<{ framework: FrameworkDTO }>(res);
  return data.framework;
}

export async function deleteFramework(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/frameworks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Suppression échouée (${res.status})`);
}

export async function duplicateFramework(id: string): Promise<FrameworkDTO> {
  const res = await fetch(`${API_URL}/api/frameworks/${id}/duplicate`, { method: 'POST' });
  const data = await asJson<{ framework: FrameworkDTO }>(res);
  return data.framework;
}

// --- Documents (RAG) --------------------------------------------------------

export async function listDocuments(
  frameworkId: string,
  signal?: AbortSignal,
): Promise<DocumentDTO[]> {
  const res = await fetch(`${API_URL}/api/frameworks/${frameworkId}/documents`, { signal });
  const data = await asJson<{ documents: DocumentDTO[] }>(res);
  return data.documents;
}

export async function uploadDocument(frameworkId: string, file: File): Promise<DocumentDTO> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/frameworks/${frameworkId}/documents`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Échec de l’envoi (${res.status})`);
  }
  const data = (await res.json()) as { document: DocumentDTO };
  return data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Suppression échouée (${res.status})`);
}

export async function listConversationDocuments(
  conversationId: string,
  signal?: AbortSignal,
): Promise<DocumentDTO[]> {
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/documents`, { signal });
  const data = await asJson<{ documents: DocumentDTO[] }>(res);
  return data.documents;
}

export async function uploadConversationDocument(
  conversationId: string,
  file: File,
): Promise<DocumentDTO> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/documents`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Échec de l’envoi (${res.status})`);
  }
  const data = (await res.json()) as { document: DocumentDTO };
  return data.document;
}

// --- Accès élève (côté enseignant) -----------------------------------------

export async function listAccesses(signal?: AbortSignal): Promise<AccessDTO[]> {
  const res = await fetch(`${API_URL}/api/accesses`, { signal });
  const data = await asJson<{ accesses: AccessDTO[] }>(res);
  return data.accesses;
}

export async function createAccess(input: {
  frameworkId: string;
  name: string;
  studentNames: string[];
}): Promise<AccessDTO> {
  const res = await fetch(`${API_URL}/api/accesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Échec (${res.status})`);
  }
  const data = (await res.json()) as { access: AccessDTO };
  return data.access;
}

export async function getAccess(id: string, signal?: AbortSignal): Promise<AccessDetailDTO> {
  const res = await fetch(`${API_URL}/api/accesses/${id}`, { signal });
  const data = await asJson<{ access: AccessDetailDTO }>(res);
  return data.access;
}

export async function renameAccess(id: string, name: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/accesses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Échec (${res.status})`);
}

export async function deleteAccess(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/accesses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Échec (${res.status})`);
}

/** (Dés)active un espace — le lien élève est coupé, les échanges sont conservés. */
export async function setAccessActive(id: string, active: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/accesses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error(`Échec (${res.status})`);
}

export async function addStudent(
  accessId: string,
  displayName: string,
): Promise<{ id: string; displayName: string }> {
  const res = await fetch(`${API_URL}/api/accesses/${accessId}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const data = await asJson<{ student: { id: string; displayName: string } }>(res);
  return data.student;
}

export async function removeStudent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/students/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Échec (${res.status})`);
}

export async function getStudentConversationsForTeacher(
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentConversationDTO[]> {
  const res = await fetch(`${API_URL}/api/students/${studentId}/conversations`, { signal });
  const data = await asJson<{ conversations: StudentConversationDTO[] }>(res);
  return data.conversations;
}

export async function getSupervisionMessages(
  conversationId: string,
  signal?: AbortSignal,
): Promise<StoredMessage[]> {
  const res = await fetch(`${API_URL}/api/supervision/conversations/${conversationId}/messages`, {
    signal,
  });
  const data = await asJson<{ messages: StoredMessage[] }>(res);
  return data.messages;
}

// --- Espace élève (via token) ----------------------------------------------

export async function getStudentAccess(
  token: string,
  signal?: AbortSignal,
): Promise<StudentAccessInfo> {
  const res = await fetch(`${API_URL}/api/e/${token}`, { signal });
  const data = await asJson<{ access: StudentAccessInfo }>(res);
  return data.access;
}

export async function listStudentConversations(
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentConversationDTO[]> {
  const res = await fetch(`${API_URL}/api/e/${token}/conversations?studentId=${studentId}`, {
    signal,
  });
  const data = await asJson<{ conversations: StudentConversationDTO[] }>(res);
  return data.conversations;
}

export async function createStudentConversation(
  token: string,
  studentId: string,
): Promise<StudentConversationDTO> {
  const res = await fetch(`${API_URL}/api/e/${token}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  const data = await asJson<{ conversation: StudentConversationDTO }>(res);
  return data.conversation;
}

export async function loadStudentConversation(
  token: string,
  id: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ conversation: { id: string; title: string }; messages: StoredMessage[] }> {
  const res = await fetch(`${API_URL}/api/e/${token}/conversations/${id}?studentId=${studentId}`, {
    signal,
  });
  return asJson(res);
}
