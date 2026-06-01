'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { ConversationSummary } from '@/lib/types';
import { CheckIcon, PencilIcon, TrashIcon } from './icons';

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== conversation.title) onRename(next);
    else setDraft(conversation.title);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(conversation.title);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-button border border-accent bg-surface px-2 py-1 shadow-glow">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label="Renommer la conversation"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Valider le titre"
          className="shrink-0 text-muted-foreground transition-colors hover:text-accent"
        >
          <CheckIcon className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-1 rounded-button transition-colors duration-150 ${
        active ? 'bg-accent-soft' : 'hover:bg-surface-muted'
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-1 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-all duration-200 ${
          active ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
        }`}
      />
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={`min-w-0 flex-1 truncate py-2 pr-1 pl-3 text-left text-sm ${
          active ? 'font-semibold text-foreground' : 'text-muted-foreground'
        }`}
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <span className="flex shrink-0 items-center pr-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.title);
            setEditing(true);
          }}
          aria-label="Renommer la conversation"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
        >
          <PencilIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer la conversation"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-border/60 hover:text-danger"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
