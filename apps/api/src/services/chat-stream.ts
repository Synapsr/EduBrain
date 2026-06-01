import type { LanguageModelV2 } from '@ai-sdk/provider';
import { compileFramework, type Framework } from '@edubrain/core/frameworks';
import { RAG_MIN_SIMILARITY, RAG_TOP_K } from '@edubrain/core/rag';
import { convertToModelMessages, generateId, streamText, type UIMessage } from 'ai';
import type { AppContext } from '../context';
import { describeChatError } from '../errors';
import { DEFAULT_SYSTEM_PROMPT } from '../prompts';
import { extractText, persistTurn } from './conversations';
import { retrieveChunks } from './documents';

export interface ChatSource {
  index: number;
  documentId: string;
  filename: string;
  snippet: string;
}

/** Texte du dernier message utilisateur (pour la requête RAG). */
export function lastUserQuery(uiMessages: ReadonlyArray<UIMessage>): string {
  const last = [...uiMessages].reverse().find((m) => m.role === 'user');
  return last ? extractText(last.parts as Array<{ type: string; text?: unknown }>) : '';
}

/**
 * Compose le prompt système (Cadre compilé sinon défaut) et **injecte les
 * passages RAG** (sources citées) — mutualisé entre chat enseignant et élève.
 */
export async function composeSystemAndSources(
  ctx: AppContext,
  opts: {
    framework: Framework | null;
    query: string;
    scope: { conversationId?: string; frameworkId?: string | null };
  },
): Promise<{ system: string; sources: ChatSource[] }> {
  let system = opts.framework
    ? compileFramework(opts.framework).systemPrompt
    : DEFAULT_SYSTEM_PROMPT;
  const sources: ChatSource[] = [];

  if (opts.query) {
    try {
      const retrieved = await retrieveChunks(
        ctx.db,
        ctx.embedder,
        opts.scope,
        opts.query,
        RAG_TOP_K,
        RAG_MIN_SIMILARITY,
      );
      retrieved.forEach((chunk, i) => {
        sources.push({
          index: i + 1,
          documentId: chunk.documentId,
          filename: chunk.filename,
          snippet: chunk.content.slice(0, 220),
        });
      });
      if (retrieved.length > 0) {
        const block = retrieved
          .map((chunk, i) => `[${i + 1}] (source : « ${chunk.filename} »)\n${chunk.content}`)
          .join('\n\n');
        system +=
          "\n\nContexte documentaire (extraits des ressources de l'enseignant). " +
          'Appuie-toi en priorité sur ces extraits et cite tes sources avec leur numéro ' +
          "entre crochets (ex. [1]). Si l'information ne s'y trouve pas, indique-le.\n\n" +
          block;
      }
    } catch (err) {
      ctx.logger.warn({ err }, 'échec récupération RAG');
    }
  }
  return { system, sources };
}

/** Lance le streaming (`toUIMessageStreamResponse`) et persiste le tour. */
export function streamChatResponse(
  ctx: AppContext,
  opts: {
    model: LanguageModelV2;
    system: string;
    uiMessages: UIMessage[];
    conversationId: string;
    sources: ChatSource[];
  },
): Response {
  const result = streamText({
    model: opts.model,
    system: opts.system,
    messages: convertToModelMessages(opts.uiMessages),
  });

  let totalTokens: number | undefined;

  return result.toUIMessageStreamResponse({
    originalMessages: opts.uiMessages,
    generateMessageId: generateId,
    messageMetadata: ({ part }) => {
      if (part.type !== 'finish') return undefined;
      totalTokens = part.totalUsage.totalTokens;
      return { totalTokens, sources: opts.sources };
    },
    onFinish: async ({ messages: finalMessages }) => {
      try {
        const lastIndex = finalMessages.length - 1;
        const enriched = finalMessages.map((message, index) => {
          if (index !== lastIndex || message.role !== 'assistant') return message;
          const existing = (message.metadata as Record<string, unknown> | undefined) ?? {};
          return {
            ...message,
            metadata: {
              ...existing,
              ...(totalTokens !== undefined ? { totalTokens } : {}),
              ...(opts.sources.length > 0 ? { sources: opts.sources } : {}),
            },
          };
        });
        await persistTurn(ctx.db, opts.conversationId, enriched);
      } catch (err) {
        ctx.logger.error({ err, conversationId: opts.conversationId }, 'échec persistance');
      }
    },
    onError: (error) => {
      ctx.logger.warn({ err: error, conversationId: opts.conversationId }, 'erreur streaming');
      return describeChatError(error);
    },
  });
}
