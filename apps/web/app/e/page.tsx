'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ArrowRightIcon, LogoMark } from '../_components/icons';

/**
 * Saisie du code d'accès (quand l'élève arrive sur `/e` sans token).
 * Redirige vers `/e/<code>` ; un code invalide est géré par l'espace élève.
 */
export default function StudentJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (c) router.push(`/e/${encodeURIComponent(c)}`);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm animate-rise-in rounded-card border border-border bg-surface p-7 text-center shadow-pop"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent text-accent-foreground shadow-card">
          <LogoMark className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Rejoindre votre espace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez le code communiqué par votre enseignant·e.
        </p>

        <label htmlFor="access-code" className="sr-only">
          Code d’accès
        </label>
        <input
          id="access-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code d’accès"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // biome-ignore lint/a11y/noAutofocus: champ unique d'une page dédiée à la saisie
          autoFocus
          className="mt-5 w-full rounded-button border border-border bg-background px-4 py-3 text-center font-mono text-lg tracking-widest outline-none transition-all focus:border-accent/50 focus:shadow-glow"
        />

        <button
          type="submit"
          disabled={!code.trim()}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-button bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          Continuer
          <ArrowRightIcon className="size-4" />
        </button>

        <p className="mt-5 text-xs text-muted-foreground">Démo — données fictives.</p>
      </form>
    </div>
  );
}
