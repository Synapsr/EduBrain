'use client';

import { fr } from '@edubrain/core';
import type { FrameworkDTO } from '@/lib/types';
import { CadreItem } from './cadre-item';
import { LogoMark, PlusIcon, SpinnerIcon } from './icons';
import { SectionNav } from './section-nav';
import { ThemeToggle } from './theme-toggle';

/** Liste latérale des Cadres — même structure que la sidebar des conversations. */
export function CadresSidebar({
  frameworks,
  activeId,
  creating,
  loading,
  onOverview,
  onNew,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  frameworks: FrameworkDTO[];
  activeId: string | null;
  creating: boolean;
  loading: boolean;
  onOverview: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
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
          Nouveau cadre
        </button>
        <SectionNav onResetActive={onOverview} />
      </div>

      <nav aria-label="Cadres d’usage" className="mt-1 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pt-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Cadres d’usage
        </p>

        {creating ? (
          <div className="mb-0.5 flex items-center gap-1 rounded-button bg-accent-soft py-2 pr-1 pl-3">
            <span className="text-sm font-semibold italic text-accent">Nouveau cadre…</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <SpinnerIcon className="size-4" />
            {fr.common.loading}
          </div>
        ) : frameworks.length === 0 && !creating ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Aucun cadre.</p>
        ) : (
          <ul className="space-y-0.5">
            {frameworks.map((framework, index) => (
              <li
                key={framework.id}
                className="animate-slide-in"
                style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
              >
                <CadreItem
                  framework={framework}
                  active={framework.id === activeId}
                  onSelect={() => onSelect(framework.id)}
                  onRename={(name) => onRename(framework.id, name)}
                  onDuplicate={() => onDuplicate(framework.id)}
                  onDelete={() => onDelete(framework.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {frameworks.length} cadre{frameworks.length > 1 ? 's' : ''}
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
