'use client';

import { DEMO_CLASSES, DEMO_ESTABLISHMENT } from '@edubrain/core/access';
import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { FrameworkDTO } from '@/lib/types';
import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  GridIcon,
  InfoIcon,
  SparkIcon,
  UserIcon,
} from './icons';

const inputClass =
  'w-full rounded-button border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-accent/50 focus:shadow-glow';

type Scope = 'class' | 'student';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Création d'un espace élève. Simule un établissement fictif : on choisit un
 * Cadre, puis **une classe entière** ou **un élève en particulier** via un
 * sélecteur visuel (aperçu du roster). Micro-interactions cohérentes avec le
 * design system (« modernisme civique »). Données fictives uniquement.
 */
export function AccessCreate({
  frameworks,
  onCreate,
  onCancel,
}: {
  frameworks: FrameworkDTO[];
  onCreate: (input: { frameworkId: string; name: string; studentNames: string[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [frameworkId, setFrameworkId] = useState(frameworks[0]?.id ?? '');
  const [scope, setScope] = useState<Scope>('class');
  const [classId, setClassId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedClass = useMemo(
    () => DEMO_CLASSES.find((c) => c.id === classId) ?? null,
    [classId],
  );

  // Sélectionne un Cadre par défaut dès que la liste arrive (chargement async).
  useEffect(() => {
    if (!frameworkId && frameworks[0]) setFrameworkId(frameworks[0].id);
  }, [frameworks, frameworkId]);

  // Nom pré-rempli depuis la sélection, tant que l'enseignant ne l'a pas édité.
  const derivedName = useMemo(() => {
    if (!selectedClass) return '';
    if (scope === 'class') return selectedClass.name;
    return studentName ? `${studentName} · ${selectedClass.name}` : selectedClass.name;
  }, [scope, selectedClass, studentName]);

  useEffect(() => {
    if (!nameTouched) setName(derivedName);
  }, [derivedName, nameTouched]);

  const selectClass = (id: string) => {
    setClassId(id);
    setStudentName(null);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frameworkId) return setError('Choisissez un Cadre d’usage.');
    if (!selectedClass) return setError('Choisissez une classe.');
    if (scope === 'student' && !studentName) return setError('Choisissez un élève.');

    const studentNames =
      scope === 'class' ? [...selectedClass.students] : studentName ? [studentName] : [];
    const finalName = name.trim() || derivedName;
    setError(null);
    setSaving(true);
    try {
      await onCreate({ frameworkId, name: finalName, studentNames });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la création.');
      setSaving(false);
    }
  };

  // Sans Cadre, on ne peut pas encadrer un espace : on guide vers la création.
  if (frameworks.length === 0) {
    return (
      <div className="max-w-2xl animate-fade-in space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Nouvel espace élève</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un espace élève s’appuie toujours sur un Cadre d’usage.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent">
            <SparkIcon className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Créez d’abord un Cadre d’usage</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Le Cadre encadre l’assistant (persona, ton, garde-fous). Créez-en un, puis revenez
            ouvrir un espace pour vos élèves.
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/cadres"
              className="rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all hover:bg-accent-hover active:scale-95"
            >
              Créer un Cadre
            </Link>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-button border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl animate-fade-in space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Nouvel espace élève</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ouvrez un accès à une classe ou à un élève, <em>sous un Cadre</em>. Préfiguration de la
          phase 2 — données fictives.
        </p>
      </div>

      {/* Établissement (fictif) */}
      <div className="flex items-center gap-3 rounded-card border border-accent/20 bg-accent-soft/60 px-4 py-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-card">
          <BuildingIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{DEMO_ESTABLISHMENT}</p>
          <p className="text-xs text-muted-foreground">
            Établissement de démonstration · {DEMO_CLASSES.length} classes · données fictives
          </p>
        </div>
      </div>

      {/* Cadre d'usage */}
      <section className="space-y-2 rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <SparkIcon className="size-4 text-accent" />
          Cadre d’usage appliqué
        </span>
        <label className="block">
          <span className="sr-only">Cadre d’usage</span>
          <select
            value={frameworkId}
            onChange={(e) => setFrameworkId(e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          L’assistant s’adressera aux élèves <em>sous ce Cadre</em> (persona, ton, garde-fous).
        </p>
      </section>

      {/* Portée : classe entière ou élève */}
      <section className="space-y-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-sm font-semibold">À qui ouvrir l’accès&nbsp;?</span>

        <div
          role="radiogroup"
          aria-label="Type d’accès"
          className="relative flex rounded-button border border-border bg-surface-muted p-1"
        >
          <span
            aria-hidden
            className={`absolute inset-y-1 rounded-md bg-surface shadow-card transition-all duration-300 [transition-timing-function:var(--ease-spring)] ${
              scope === 'class' ? 'left-1 right-1/2 mr-0.5' : 'left-1/2 right-1 ml-0.5'
            }`}
          />
          {/* biome-ignore lint/a11y/useSemanticElements: bouton stylé en radio (choix unique) */}
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'class'}
            onClick={() => setScope('class')}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              scope === 'class' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GridIcon className="size-4" />
            Une classe entière
          </button>
          {/* biome-ignore lint/a11y/useSemanticElements: bouton stylé en radio (choix unique) */}
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'student'}
            onClick={() => setScope('student')}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              scope === 'student' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="size-4" />
            Un élève en particulier
          </button>
        </div>

        {/* Mode « une classe » : cartes avec aperçu du roster (bouton info) */}
        {scope === 'class' ? (
          <div
            key="class-grid"
            role="radiogroup"
            aria-label="Classe"
            className="grid animate-fade-in gap-2.5 sm:grid-cols-2"
          >
            {DEMO_CLASSES.map((cls, index) => {
              const selected = cls.id === classId;
              const expanded = cls.id === expandedId;
              return (
                <div
                  key={cls.id}
                  style={{ animationDelay: `${Math.min(index * 0.04, 0.2)}s` }}
                  className={`flex animate-rise-in flex-col overflow-hidden rounded-card border bg-surface shadow-card transition-all duration-200 ${
                    selected
                      ? 'border-accent ring-1 ring-accent/30'
                      : 'border-border hover:border-accent/30'
                  }`}
                >
                  {/* biome-ignore lint/a11y/useSemanticElements: bouton stylé en radio (choix unique) */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectClass(cls.id)}
                    className="flex items-center gap-2.5 p-3 text-left transition-colors hover:bg-surface-muted/60"
                  >
                    <span
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        selected ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent'
                      }`}
                    >
                      {cls.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.students.length} élèves</p>
                    </div>
                    <span
                      aria-hidden
                      className={`inline-flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all duration-200 ${
                        selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      }`}
                    >
                      <CheckIcon className="size-3.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Masquer' : 'Voir'} les élèves de ${cls.name}`}
                    onClick={() => setExpandedId(expanded ? null : cls.id)}
                    className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <InfoIcon className="size-3.5" />
                    {expanded ? 'Masquer les élèves' : 'Voir les élèves'}
                    <ChevronDownIcon
                      className={`ml-auto size-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 [transition-timing-function:var(--ease-out-soft)] ${
                      expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul
                        aria-hidden={!expanded}
                        className="flex flex-wrap gap-1.5 border-t border-border bg-surface-muted/40 p-3"
                      >
                        {cls.students.map((student) => (
                          <li
                            key={student}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-xs shadow-card"
                          >
                            <span className="inline-flex size-4 items-center justify-center rounded-full bg-accent-soft text-[0.6rem] font-bold text-accent">
                              {initials(student)}
                            </span>
                            {student}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Mode « un élève » : classe compacte (chips), puis choix de l'élève */
          <div key="student-mode" className="animate-fade-in space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Classe</p>
              <div role="radiogroup" aria-label="Classe" className="flex flex-wrap gap-1.5">
                {DEMO_CLASSES.map((cls) => {
                  const sel = cls.id === classId;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: puce stylée en radio (choix unique)
                    <button
                      key={cls.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => selectClass(cls.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-150 active:scale-95 ${
                        sel
                          ? 'border-accent bg-accent-soft font-semibold text-accent'
                          : 'border-border bg-surface text-muted-foreground hover:border-accent/30 hover:text-foreground'
                      }`}
                    >
                      <span
                        className={`inline-flex size-5 items-center justify-center rounded-md text-[0.65rem] font-bold transition-colors ${
                          sel ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent'
                        }`}
                      >
                        {cls.level}
                      </span>
                      {cls.name}
                      <span className="text-xs text-muted-foreground">· {cls.students.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 [transition-timing-function:var(--ease-out-soft)] ${
                selectedClass ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {selectedClass ? (
                  <div className="pt-1">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      Élève de {selectedClass.name}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label="Élève"
                      className="grid gap-1.5 sm:grid-cols-2"
                    >
                      {selectedClass.students.map((student, index) => {
                        const picked = student === studentName;
                        return (
                          // biome-ignore lint/a11y/useSemanticElements: ligne stylée en radio (choix unique)
                          <button
                            key={student}
                            type="button"
                            role="radio"
                            aria-checked={picked}
                            onClick={() => {
                              setStudentName(student);
                              setError(null);
                            }}
                            style={{ animationDelay: `${Math.min(index * 0.03, 0.2)}s` }}
                            className={`flex animate-slide-in items-center gap-2.5 rounded-button border px-3 py-2 text-left text-sm transition-all duration-150 hover:-translate-y-px ${
                              picked
                                ? 'border-accent bg-accent-soft font-medium text-accent'
                                : 'border-border hover:border-accent/30 hover:bg-surface-muted'
                            }`}
                          >
                            <span
                              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                picked
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-accent-soft text-accent'
                              }`}
                            >
                              {initials(student)}
                            </span>
                            <span className="truncate">{student}</span>
                            {picked ? (
                              <CheckIcon className="ml-auto size-4 shrink-0 animate-pop-in" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="px-1 pt-1 text-xs text-muted-foreground">
                    Choisissez d’abord une classe.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Nom de l'espace */}
      <section className="space-y-2 rounded-card border border-border bg-surface p-5 shadow-card">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nom de l’espace</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            placeholder={derivedName || 'Ex. 6e B — Révisions'}
            className={inputClass}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Pré-rempli depuis votre sélection ; modifiable. Visible par vous seul·e.
        </p>
      </section>

      {error ? (
        <p role="alert" className="animate-rise-in text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Création…' : 'Créer l’espace'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-button border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
