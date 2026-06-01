'use client';

import { useChat } from '@ai-sdk/react';
import { fr, type ModelTier } from '@edubrain/core';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyFramework,
  CHAT_ENDPOINT,
  deleteDocument,
  listConversationDocuments,
  uploadConversationDocument,
} from '@/lib/api';
import type { DocumentDTO, FrameworkDTO } from '@/lib/types';
import { Composer } from './composer';
import { EmptyState } from './empty-state';
import { RefreshIcon, SparkIcon } from './icons';
import { MessageItem } from './message-item';

/**
 * Fil de conversation (un par conversation, monté avec `key={conversationId}`).
 * Gère le streaming via `useChat`, la persistance se faisant côté API à la fin
 * de chaque tour (`onFinish`). Affiche les erreurs en français avec réessai.
 */
export function ChatThread({
  conversationId,
  initialMessages,
  initialModelTier,
  initialFrameworkId,
  frameworks,
  onTurnFinished,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  initialModelTier: ModelTier;
  initialFrameworkId: string | null;
  frameworks: FrameworkDTO[];
  onTurnFinished: () => void;
}) {
  const [modelTier, setModelTier] = useState<ModelTier>(initialModelTier);
  const modelTierRef = useRef(modelTier);
  modelTierRef.current = modelTier;

  const [frameworkId, setFrameworkId] = useState<string | null>(initialFrameworkId);
  const changeFramework = (next: string | null) => {
    setFrameworkId(next);
    applyFramework(conversationId, next).catch(() => setFrameworkId(frameworkId));
  };

  // Documents joints à la conversation (dépôt direct dans le chat).
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listConversationDocuments(conversationId, controller.signal)
      .then(setDocuments)
      .catch(() => undefined);
    return () => controller.abort();
  }, [conversationId]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setDocError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files))
          await uploadConversationDocument(conversationId, file);
        setDocuments(await listConversationDocuments(conversationId));
      } catch (err) {
        setDocError(err instanceof Error ? err.message : 'Échec de l’envoi.');
      } finally {
        setUploading(false);
      }
    },
    [conversationId],
  );

  const handleDeleteDoc = useCallback(
    async (id: string) => {
      await deleteDocument(id).catch(() => undefined);
      setDocuments(await listConversationDocuments(conversationId));
    },
    [conversationId],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: CHAT_ENDPOINT,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, messages, conversationId, modelTier: modelTierRef.current },
        }),
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => onTurnFinished(),
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: défilement à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const busy = status === 'submitted' || status === 'streaming';
  const lastIndex = messages.length - 1;
  const activeFramework = frameworks.find((f) => f.id === frameworkId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex-1 overflow-y-auto">
        {activeFramework ? (
          <div className="pointer-events-none sticky top-0 z-10 flex justify-center bg-gradient-to-b from-canvas via-canvas/85 to-transparent px-4 pt-3 pb-5">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <SparkIcon className="size-3.5" />
              Cadre&nbsp;: {activeFramework.name}
            </span>
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className={`space-y-7 ${activeFramework ? 'pt-2' : 'pt-8'}`}>
            {messages.length === 0 ? (
              <EmptyState onPick={(text) => sendMessage({ text })} />
            ) : (
              messages.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  streaming={busy && index === lastIndex && message.role === 'assistant'}
                />
              ))
            )}

            {error ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-sm"
              >
                <span className="text-foreground">{error.message || fr.errors.generic}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    regenerate();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-button border border-border bg-surface px-2.5 py-1.5 font-medium transition-colors hover:bg-surface-muted"
                >
                  <RefreshIcon className="size-4" />
                  {fr.common.retry}
                </button>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <Composer
        status={status}
        modelTier={modelTier}
        onModelChange={setModelTier}
        frameworks={frameworks}
        frameworkId={frameworkId}
        onFrameworkChange={changeFramework}
        documents={documents}
        uploading={uploading}
        uploadError={docError}
        onUpload={handleUpload}
        onDeleteDoc={handleDeleteDoc}
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
      />
    </div>
  );
}
