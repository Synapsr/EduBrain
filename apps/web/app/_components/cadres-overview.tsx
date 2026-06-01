'use client';

import type { FrameworkDTO } from '@/lib/types';
import { ArrowRightIcon, CopyIcon, PlusIcon, SparkIcon, TrashIcon } from './icons';

/** Vue d'ensemble (listing) des Cadres d'usage — galerie de cartes. */
export function CadresOverview({
  frameworks,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
}: {
  frameworks: FrameworkDTO[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cadres d’usage</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Des configurations réutilisables qui encadrent l’assistant : persona, ton, règles et
            documents. Appliquez-en un à une conversation depuis la saisie.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-button bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95"
        >
          <PlusIcon className="size-4" />
          Nouveau cadre
        </button>
      </div>

      {frameworks.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent">
            <SparkIcon className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Aucun cadre pour le moment</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Créez votre premier cadre pour encadrer l’assistant selon vos besoins.
          </p>
          <button
            type="button"
            onClick={onNew}
            className="mt-5 rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover active:scale-95"
          >
            Créer un cadre
          </button>
        </div>
      ) : (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {frameworks.map((framework, index) => (
            <li
              key={framework.id}
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              className="group animate-rise-in"
            >
              <div className="flex h-full flex-col rounded-card border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-float">
                <button
                  type="button"
                  onClick={() => onOpen(framework.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold tracking-tight">
                      {framework.name}
                    </h3>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  {framework.subject || framework.level ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[framework.subject, framework.level].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {framework.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {framework.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {framework.doRules.length} règle(s)
                    </span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {framework.dontRules.length} garde-fou(s)
                    </span>
                    {framework.visibility === 'shared' ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Partageable
                      </span>
                    ) : null}
                  </div>
                </button>
                <div className="mt-3 flex gap-1 border-t border-border pt-2.5">
                  <button
                    type="button"
                    onClick={() => onDuplicate(framework.id)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <CopyIcon className="size-3.5" /> Dupliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(framework.id)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
                  >
                    <TrashIcon className="size-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
