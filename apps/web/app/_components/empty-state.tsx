'use client';

import { ArrowRightIcon, SparkIcon } from './icons';

const SUGGESTIONS = [
  'Prépare une séance de 50 minutes sur les fractions en CM1.',
  'Génère 5 exercices différenciés (3 niveaux) sur l’accord du participe passé.',
  'Propose une évaluation formative sur le cycle de l’eau en 6e.',
  'Explique la photosynthèse à des élèves de 5e avec une analogie simple.',
];

/** État vide pédagogique : guide l'enseignant avec des exemples de demandes. */
export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="animate-rise-in py-10">
      <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent shadow-card">
        <SparkIcon className="size-6" />
      </span>
      <h2 className="mt-5 text-3xl tracking-tight">Par où commencer&nbsp;?</h2>
      <p className="mt-2.5 max-w-lg leading-relaxed text-muted-foreground">
        Décrivez votre besoin pédagogique. EduBrain vous aide à préparer, différencier, générer des
        exercices et évaluer — en français, sans donnée d’élève.
      </p>

      <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((text, index) => (
          <li
            key={text}
            className="animate-rise-in"
            style={{ animationDelay: `${0.08 + index * 0.06}s` }}
          >
            <button
              type="button"
              onClick={() => onPick(text)}
              className="group flex h-full w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-left text-sm shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-float"
            >
              <span className="flex-1 leading-snug">{text}</span>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
