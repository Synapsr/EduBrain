'use client';

import { fr } from '@edubrain/core';
import type { AccessDTO } from '@/lib/types';
import { LogoMark, PlusIcon, SpinnerIcon, TrashIcon } from './icons';
import { SectionNav } from './section-nav';
import { ThemeToggle } from './theme-toggle';

export function AccessesSidebar({
  accesses,
  activeId,
  creating,
  loading,
  onOverview,
  onNew,
  onSelect,
  onDelete,
}: {
  accesses: AccessDTO[];
  activeId: string | null;
  creating: boolean;
  loading: boolean;
  onOverview: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
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
          Nouvel espace élève
        </button>
        <SectionNav onResetActive={onOverview} />
      </div>

      <nav aria-label="Espaces élèves" className="mt-1 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pt-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Espaces élèves
        </p>
        {creating ? (
          <div className="mb-0.5 rounded-button bg-accent-soft py-2 pr-1 pl-3 text-sm font-semibold italic text-accent">
            Nouvel espace…
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <SpinnerIcon className="size-4" />
            {fr.common.loading}
          </div>
        ) : accesses.length === 0 && !creating ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Aucun espace.</p>
        ) : (
          <ul className="space-y-0.5">
            {accesses.map((access, index) => (
              <li
                key={access.id}
                className="animate-slide-in"
                style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
              >
                <div
                  className={`group relative flex items-center gap-1 rounded-button transition-colors duration-150 ${
                    access.id === activeId ? 'bg-accent-soft' : 'hover:bg-surface-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-1 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-all duration-200 ${
                      access.id === activeId ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelect(access.id)}
                    className={`min-w-0 flex-1 py-2 pr-1 pl-3 text-left ${
                      access.id === activeId ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="block truncate text-sm font-medium">{access.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {access.framework.name} · {access.studentCount} élève
                      {access.studentCount > 1 ? 's' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(access.id)}
                    aria-label="Supprimer l’espace"
                    className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-border/60 hover:text-danger group-hover:opacity-100"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">Données fictives · démo</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
