import { fr } from '@edubrain/core';

/** Bandeau « mode démo » — affiché quand aucune clé Albert n'est configurée. */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-warning/25 bg-warning/12 px-4 py-1.5 text-center text-xs font-medium text-warning-foreground"
    >
      <span
        aria-hidden
        className="inline-flex size-1.5 shrink-0 animate-pulse rounded-full bg-warning"
      />
      <span>{fr.app.demoBanner}</span>
    </div>
  );
}
