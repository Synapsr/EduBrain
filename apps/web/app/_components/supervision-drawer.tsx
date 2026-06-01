'use client';

import type { UIMessage } from 'ai';
import { useCallback, useEffect, useState } from 'react';
import { getStudentConversationsForTeacher, getSupervisionMessages } from '@/lib/api';
import type { StoredMessage, StudentConversationDTO } from '@/lib/types';
import { ChatBubbleIcon, SpinnerIcon, XIcon } from './icons';
import { MessageItem } from './message-item';

/**
 * Tiroir de supervision : conversations d'un élève (lecture seule). L'enseignant
 * voit les échanges de ses élèves sous le Cadre.
 */
export function SupervisionDrawer({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const [conversations, setConversations] = useState<StudentConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getStudentConversationsForTeacher(studentId, controller.signal)
      .then((list) => {
        setConversations(list);
        setOpenId(list[0]?.id ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [studentId]);

  const loadMessages = useCallback((conversationId: string) => {
    setMessages(null);
    getSupervisionMessages(conversationId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    if (openId) loadMessages(openId);
  }, [openId, loadMessages]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative flex h-full w-full max-w-xl animate-slide-in flex-col border-l border-border bg-background shadow-pop">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Échanges de</p>
            <h2 className="font-display text-lg font-bold tracking-tight">{studentName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex size-8 items-center justify-center rounded-button text-muted-foreground hover:bg-surface-muted"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <SpinnerIcon className="size-4" /> Chargement…
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ChatBubbleIcon className="size-6 opacity-40" />
            Aucun échange pour cet élève.
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setOpenId(conversation.id)}
                  className={`shrink-0 rounded-button px-2.5 py-1.5 text-xs transition-colors ${
                    conversation.id === openId
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-muted-foreground hover:bg-surface-muted'
                  }`}
                  title={conversation.title}
                >
                  <span className="block max-w-[12rem] truncate">{conversation.title}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {messages === null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SpinnerIcon className="size-4" /> Chargement…
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message as unknown as UIMessage}
                      variant="supervision"
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
