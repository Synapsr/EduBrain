export type { Database } from './client';
export { createDb } from './client';
export type {
  AccessRow,
  ChunkRow,
  Conversation,
  DocumentRow,
  FrameworkRow,
  Message,
  NewAccessRow,
  NewChunkRow,
  NewConversation,
  NewDocumentRow,
  NewFrameworkRow,
  NewMessage,
  NewStudentRow,
  NewTeacher,
  StudentRow,
  Teacher,
} from './schema';
export * as schema from './schema';
export {
  accesses,
  chunks,
  conversations,
  documents,
  frameworks,
  messages,
  students,
  teachers,
} from './schema';
