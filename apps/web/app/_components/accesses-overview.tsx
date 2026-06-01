'use client';

import { useState } from 'react';
import type { AccessDTO } from '@/lib/types';
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SparkIcon,
  TrashIcon,
  UsersIcon,
} from './icons';

/** Copie le lien d'accès élève (`/e/<token>`) — origine calculée côté client. */
function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/e/${token}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* presse-papiers indisponible */
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-success" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
        {copied ? 'Lien copié' : 'Copier le lien'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Lien copié dans le presse-papiers.' : ''}
      </span>
    </>
  );
}

/** Vue d'ensemble (listing) des espaces élèves — galerie de cartes. */
export function AccessesOverview({
  accesses,
  onOpen,
  onNew,
  onDelete,
}: {
  accesses: AccessDTO[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Espaces élèves</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Ouvrez un accès à une classe sous un Cadre d’usage : partagez un lien, vos élèves
            discutent avec l’assistant encadré, et vous suivez leurs échanges. (Données fictives.)
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-button bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95"
        >
          <PlusIcon className="size-4" />
          Nouvel espace élève
        </button>
      </div>

      {accesses.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent">
            <UsersIcon className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Aucun espace pour le moment</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Créez un espace pour partager un Cadre à une classe et suivre les échanges de vos
            élèves.
          </p>
          <button
            type="button"
            onClick={onNew}
            className="mt-5 rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover active:scale-95"
          >
            Créer un espace
          </button>
        </div>
      ) : (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accesses.map((access, index) => (
            <li
              key={access.id}
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              className="group animate-rise-in"
            >
              <div className="flex h-full flex-col rounded-card border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-float">
                <button
                  type="button"
                  onClick={() => onOpen(access.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold tracking-tight">
                      {access.name}
                    </h3>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SparkIcon className="size-3.5 text-accent" />
                    {access.framework.name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <UsersIcon className="size-3" />
                      {access.studentCount} élève{access.studentCount > 1 ? 's' : ''}
                    </span>
                    {access.active ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Lien actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-danger-foreground">
                        Désactivé
                      </span>
                    )}
                  </div>
                </button>
                <div className="mt-3 flex gap-1 border-t border-border pt-2.5">
                  {access.active ? (
                    <CopyLinkButton token={access.token} />
                  ) : (
                    <span className="inline-flex items-center px-2 py-1.5 text-xs text-muted-foreground">
                      Lien désactivé
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(access.id)}
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
