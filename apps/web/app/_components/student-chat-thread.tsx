'use client';

import { useChat } from '@ai-sdk/react';
import { fr } from '@edubrain/core';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { studentChatEndpoint } from '@/lib/api';
import { ArrowUpIcon, RefreshIcon, SparkIcon, StopIcon } from './icons';
import { MessageItem } from './message-item';

export function StudentChatThread({
  token,
  studentId,
  conversationId,
  initialMessages,
  onTurnFinished,
}: {
  token: string;
  studentId: string;
  conversationId: string;
  initialMessages: UIMessage[];
  onTurnFinished: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: studentChatEndpoint(token),
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, messages, studentId, conversationId },
        }),
      }),
    [token, studentId, conversationId],
  );

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => onTurnFinished(),
  });

  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  const lastIndex = messages.length - 1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: défilement à chaque message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setValue('');
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-7 px-4 pt-8 pb-4">
          {messages.length === 0 ? (
            <div className="animate-rise-in py-10 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent shadow-card">
                <SparkIcon className="size-6" />
              </span>
              <h2 className="mt-4 text-2xl tracking-tight">Pose ta question&nbsp;!</h2>
              <p className="mt-2 text-muted-foreground">
                L’assistant est là pour t’aider à réfléchir.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                variant="student"
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

      <div className="bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 pt-3 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-lg border border-border bg-surface p-1.5 pl-3 shadow-float transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-glow"
          >
            <label htmlFor="student-input" className="sr-only">
              Ton message
            </label>
            <textarea
              id="student-input"
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                resize();
              }}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Écris ta question…"
              className="block max-h-[180px] flex-1 resize-none bg-transparent py-2 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted-foreground/70"
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Arrêter"
                className="inline-flex size-9 items-center justify-center rounded-full bg-surface-muted text-foreground transition-all hover:bg-border active:scale-90"
              >
                <StopIcon className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim()}
                aria-label="Envoyer"
                className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-card transition-all hover:bg-accent-hover active:scale-90 disabled:opacity-35 disabled:shadow-none"
              >
                <ArrowUpIcon className="size-[18px]" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
