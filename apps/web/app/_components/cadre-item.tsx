'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { FrameworkDTO } from '@/lib/types';
import { CheckIcon, CopyIcon, PencilIcon, TrashIcon } from './icons';

/** Item de la liste latérale des Cadres — calqué sur `ConversationItem`. */
export function CadreItem({
  framework,
  active,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  framework: FrameworkDTO;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(framework.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== framework.name) onRename(next);
    else setDraft(framework.name);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(framework.name);
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
          aria-label="Renommer le cadre"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Valider le nom"
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
        title={framework.name}
      >
        {framework.name}
      </button>
      <span className="flex shrink-0 items-center pr-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraft(framework.name);
            setEditing(true);
          }}
          aria-label="Renommer le cadre"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
        >
          <PencilIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Dupliquer le cadre"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
        >
          <CopyIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer le cadre"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-border/60 hover:text-danger"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
