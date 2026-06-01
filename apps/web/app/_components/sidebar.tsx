'use client';

import { fr } from '@edubrain/core';
import type { ConversationSummary } from '@/lib/types';
import { ConversationItem } from './conversation-item';
import { LogoMark, PlusIcon, SpinnerIcon } from './icons';
import { SectionNav } from './section-nav';
import { ThemeToggle } from './theme-toggle';

export function Sidebar({
  conversations,
  activeId,
  loading,
  onNew,
  onOverview,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onOverview: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <span className="inline-flex size-9 items-center justify-center rounded-card bg-accent text-accent-foreground shadow-card">
          <LogoMark className="size-5" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">{fr.app.name}</span>
      </div>

      <div className="space-y-1 px-3 pb-2">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-button border border-border bg-surface px-3 py-2.5 text-sm font-semibold shadow-card transition-all duration-200 hover:-translate-y-px hover:border-accent/40 hover:shadow-float active:translate-y-0"
        >
          <span className="inline-flex size-5 items-center justify-center rounded-md bg-accent-soft text-accent">
            <PlusIcon className="size-3.5" />
          </span>
          Nouvelle conversation
        </button>
        <SectionNav onResetActive={onOverview} />
      </div>

      <nav aria-label="Conversations" className="mt-1 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pt-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Conversations
        </p>
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <SpinnerIcon className="size-4" />
            {fr.common.loading}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Aucune conversation.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation, index) => (
              <li
                key={conversation.id}
                className="animate-slide-in"
                style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
              >
                <ConversationItem
                  conversation={conversation}
                  active={conversation.id === activeId}
                  onSelect={() => onSelect(conversation.id)}
                  onRename={(title) => onRename(conversation.id, title)}
                  onDelete={() => onDelete(conversation.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          IA souveraine · Albert
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
