'use client';

import { type FrameworkInput, frameworkInputSchema } from '@edubrain/core/frameworks';
import { type ReactNode, useState } from 'react';
import type { FrameworkDTO } from '@/lib/types';
import { PlusIcon, XIcon } from './icons';

type FormState = {
  name: string;
  description: string;
  subject: string;
  level: string;
  programLink: string;
  persona: string;
  tone: string;
  doRules: string[];
  dontRules: string[];
  visibility: 'private' | 'shared';
};

function initialState(framework: FrameworkDTO | null): FormState {
  return {
    name: framework?.name ?? '',
    description: framework?.description ?? '',
    subject: framework?.subject ?? '',
    level: framework?.level ?? '',
    programLink: framework?.programLink ?? '',
    persona: framework?.persona ?? '',
    tone: framework?.tone ?? '',
    doRules: framework?.doRules ?? [],
    dontRules: framework?.dontRules ?? [],
    visibility: framework?.visibility ?? 'private',
  };
}

const inputClass =
  'w-full rounded-button border border-border bg-background px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-accent/50 focus:shadow-glow';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-bold">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: le contrôle est fourni via children (label englobant)
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function RuleList({
  rules,
  onChange,
  placeholder,
  tone,
}: {
  rules: string[];
  onChange: (rules: string[]) => void;
  placeholder: string;
  tone: 'do' | 'dont';
}) {
  const badge = tone === 'do' ? 'bg-accent-soft text-accent' : 'bg-danger/12 text-danger';
  return (
    <div>
      <ul className="space-y-2">
        {rules.map((rule, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: liste éditable ordonnée, pas d'id stable
          <li key={index} className="flex items-center gap-2">
            <span
              className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${badge}`}
            >
              {index + 1}
            </span>
            <input
              value={rule}
              onChange={(e) => {
                const next = [...rules];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(rules.filter((_, i) => i !== index))}
              aria-label="Supprimer la règle"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
            >
              <XIcon className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...rules, ''])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-button border border-dashed border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
      >
        <PlusIcon className="size-4" />
        Ajouter une règle
      </button>
    </div>
  );
}

export function FrameworkForm({
  initial,
  onSave,
  onCancel,
  documentsSlot,
}: {
  initial: FrameworkDTO | null;
  onSave: (input: FrameworkInput) => Promise<void>;
  onCancel: () => void;
  /** Panneau « Documents de référence » intégré à l'éditeur (édition seulement). */
  documentsSlot?: ReactNode;
}) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = {
      ...state,
      doRules: state.doRules.map((r) => r.trim()).filter(Boolean),
      dontRules: state.dontRules.map((r) => r.trim()).filter(Boolean),
    };
    const parsed = frameworkInputSchema.safeParse(cleaned);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Cadre invalide.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(parsed.data);
    } catch {
      setError('Enregistrement impossible. Réessayez.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="max-w-3xl space-y-5">
        <Section title="Identité" description="Comment ce cadre se présente et son contexte.">
          <Field label="Nom du cadre">
            <input
              value={state.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex. Préparation de séance"
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={state.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="À quoi sert ce cadre ?"
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matière">
              <input
                value={state.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="Ex. Mathématiques"
                className={inputClass}
              />
            </Field>
            <Field label="Niveau">
              <input
                value={state.level}
                onChange={(e) => set('level', e.target.value)}
                placeholder="Ex. CM1"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Lien programmes / CRCN" hint="Champ libre (référence officielle).">
            <input
              value={state.programLink}
              onChange={(e) => set('programLink', e.target.value)}
              className={inputClass}
            />
          </Field>
        </Section>

        <Section
          title="Comportement de l’assistant"
          description="Le rôle qu’il endosse et son ton."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rôle / persona">
              <input
                value={state.persona}
                onChange={(e) => set('persona', e.target.value)}
                placeholder="Ex. un concepteur pédagogique"
                className={inputClass}
              />
            </Field>
            <Field label="Ton">
              <input
                value={state.tone}
                onChange={(e) => set('tone', e.target.value)}
                placeholder="Ex. clair et structuré"
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Règles & garde-fous"
          description="Ce que l’assistant doit faire, et ne jamais faire."
        >
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Ce que l’assistant DOIT faire
            </span>
            <RuleList
              rules={state.doRules}
              onChange={(r) => set('doRules', r)}
              placeholder="Ex. Structurer la séance en phases"
              tone="do"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Ce que l’assistant NE DOIT PAS faire
            </span>
            <RuleList
              rules={state.dontRules}
              onChange={(r) => set('dontRules', r)}
              placeholder="Ex. Ne jamais donner la réponse finale"
              tone="dont"
            />
          </div>
        </Section>

        <Section title="Visibilité">
          <div className="inline-flex rounded-button border border-border bg-surface-muted p-0.5">
            {(['private', 'shared'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set('visibility', v)}
                className={`rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-all ${
                  state.visibility === v
                    ? 'bg-surface text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'private' ? 'Privé' : 'Partageable'}
              </button>
            ))}
          </div>
        </Section>

        {documentsSlot}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 flex items-center gap-2 border-t border-border bg-background/85 px-5 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={saving}
          className="rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-button border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
        >
          Annuler
        </button>
        {error ? (
          <span role="alert" className="ml-2 text-sm text-danger">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
