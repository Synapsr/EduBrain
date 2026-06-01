'use client';

import { useEffect, useState } from 'react';
import type { AccessDetailDTO } from '@/lib/types';
import {
  ChatBubbleIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlusIcon,
  PowerIcon,
  SparkIcon,
  TrashIcon,
} from './icons';
import { SupervisionDrawer } from './supervision-drawer';

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* presse-papiers indisponible */
          }
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-button bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover active:scale-95"
      >
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        {copied ? 'Copié' : 'Copier le lien'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Lien copié dans le presse-papiers.' : ''}
      </span>
    </>
  );
}

export function AccessDetail({
  access,
  onAddStudent,
  onRemoveStudent,
  onToggleActive,
}: {
  access: AccessDetailDTO;
  onAddStudent: (name: string) => void;
  onRemoveStudent: (id: string) => void;
  onToggleActive: (active: boolean) => void;
}) {
  const [origin, setOrigin] = useState('');
  const [newName, setNewName] = useState('');
  const [supervising, setSupervising] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/e/${access.token}`;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">{access.name}</h1>
            {!access.active ? (
              <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-danger-foreground shadow-card">
                Désactivé
              </span>
            ) : null}
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <SparkIcon className="size-3.5 text-accent" />
            Cadre : <span className="font-medium text-foreground">{access.framework.name}</span>
          </p>
        </div>
      </div>

      {/* Statut de l'espace : (dés)activation — les échanges sont conservés. */}
      <section
        className={`flex flex-wrap items-center justify-between gap-3 rounded-card border p-4 shadow-card transition-colors ${
          access.active ? 'border-border bg-surface' : 'border-danger/40 bg-danger/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${
              access.active
                ? 'bg-accent-soft text-accent'
                : 'bg-danger text-danger-foreground shadow-card'
            }`}
          >
            <PowerIcon className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <span
                className={`size-2 rounded-full ${access.active ? 'bg-success' : 'bg-danger'}`}
              />
              {access.active ? 'Espace actif' : 'Espace désactivé'}
            </p>
            <p className="text-xs text-muted-foreground">
              {access.active
                ? 'Le lien élève fonctionne. Désactivez pour couper l’accès — les échanges sont conservés.'
                : 'Le lien élève est coupé. Les échanges restent consultables ; réactivez pour rouvrir l’accès.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleActive(!access.active)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-button px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
            access.active
              ? 'border border-danger/40 text-foreground hover:border-danger/60 hover:bg-danger/10'
              : 'bg-accent text-accent-foreground shadow-card hover:bg-accent-hover'
          }`}
        >
          <PowerIcon className="size-4" />
          {access.active ? 'Désactiver l’espace' : 'Réactiver l’espace'}
        </button>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-bold">Lien d’accès élève</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Partagez ce lien avec vos élèves. Ils choisissent leur prénom et discutent avec
          l’assistant <em>sous ce Cadre</em>. (Données fictives — préfiguration d’un compte élève.)
        </p>
        {access.active ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-button border border-border bg-surface-muted px-3 py-2 font-mono text-sm">
              {link}
            </code>
            <CopyLinkButton url={link} />
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-button border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
            >
              Ouvrir
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        ) : (
          <p className="mt-3 rounded-button border border-dashed border-border bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
            Lien désactivé — réactivez l’espace pour le partager à nouveau.
          </p>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-bold">Élèves</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Roster fictif. Chaque élève retrouve ses conversations via le lien ; vous pouvez les
          consulter.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (name) {
              onAddStudent(name);
              setNewName('');
            }
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Prénom de l’élève (fictif)"
            className="flex-1 rounded-button border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-accent/50 focus:shadow-glow"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-button border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            Ajouter
          </button>
        </form>

        {access.students.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun élève. Ajoutez-en ci-dessus.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {access.students.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                    {student.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{student.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.conversationCount} conversation
                      {student.conversationCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSupervising({ id: student.id, name: student.displayName })}
                    disabled={student.conversationCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
                  >
                    <ChatBubbleIcon className="size-4" /> Voir les échanges
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStudent(student.id)}
                    aria-label={`Retirer ${student.displayName}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {supervising ? (
        <SupervisionDrawer
          studentId={supervising.id}
          studentName={supervising.name}
          onClose={() => setSupervising(null)}
        />
      ) : null}
    </div>
  );
}
