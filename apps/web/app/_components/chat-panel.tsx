'use client';

import { fr, type ModelTier } from '@edubrain/core';
import type { UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { loadConversation } from '@/lib/api';
import type { FrameworkDTO } from '@/lib/types';
import { ChatThread } from './chat-thread';
import { SpinnerIcon } from './icons';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; messages: UIMessage[]; modelTier: ModelTier; frameworkId: string | null }
  | { kind: 'error' };

/**
 * Charge l'historique d'une conversation puis monte le fil `ChatThread`.
 * Monté avec `key={conversationId}` ⇒ rechargement propre au changement.
 */
export function ChatPanel({
  conversationId,
  frameworks,
  onTurnFinished,
}: {
  conversationId: string;
  frameworks: FrameworkDTO[];
  onTurnFinished: () => void;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    loadConversation(conversationId, controller.signal)
      .then(({ conversation, messages }) => {
        const ui = messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
          metadata: m.metadata ?? undefined,
        })) as unknown as UIMessage[];
        setState({
          kind: 'ready',
          messages: ui,
          modelTier: conversation.modelTier,
          frameworkId: conversation.frameworkId,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [conversationId]);

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <SpinnerIcon className="size-4" />
        {fr.common.loading}
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {fr.errors.generic}
      </div>
    );
  }

  return (
    <ChatThread
      conversationId={conversationId}
      initialMessages={state.messages}
      initialModelTier={state.modelTier}
      initialFrameworkId={state.frameworkId}
      frameworks={frameworks}
      onTurnFinished={onTurnFinished}
    />
  );
}
