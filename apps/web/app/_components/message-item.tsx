'use client';

import type { UIMessage } from 'ai';
import { useState } from 'react';
import type { ChatSource } from '@/lib/types';
import { CheckIcon, CopyIcon, EyeIcon, FileIcon, LogoMark } from './icons';
import { MarkdownContent } from './markdown';

/**
 * Contexte d'affichage d'un message :
 * - `default` : chat de l'enseignant (sources + métadonnées visibles).
 * - `student` : espace élève — interface minimale, sans sources ni métadonnées.
 * - `supervision` : l'enseignant relit un échange élève — sources visibles avec
 *   un badge « visible par vous uniquement » (l'élève ne les voit pas).
 */
export type MessageVariant = 'default' | 'student' | 'supervision';

function partsToText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && 'text' in p)
    .map((p) => p.text)
    .join('');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      aria-label="Copier le message"
    >
      {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

export function MessageItem({
  message,
  streaming,
  variant = 'default',
}: {
  message: UIMessage;
  streaming?: boolean;
  variant?: MessageVariant;
}) {
  const text = partsToText(message);
  const metadata = message.metadata as { totalTokens?: number; sources?: ChatSource[] } | undefined;
  const tokens = metadata?.totalTokens;
  const sources = metadata?.sources ?? [];
  // L'élève ne voit ni les sources ni les métadonnées : interface épurée.
  const showSources = variant !== 'student' && !streaming && sources.length > 0;
  const showMeta = variant !== 'student' && !streaming && Boolean(text);

  if (message.role === 'user') {
    return (
      <div className="flex animate-rise-in justify-end">
        <div className="max-w-[82%] whitespace-pre-wrap rounded-card rounded-tr-sm bg-accent-soft px-4 py-2.5 text-[0.95rem] leading-relaxed text-foreground shadow-card">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-rise-in gap-3">
      <div
        aria-hidden
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-card"
      >
        <LogoMark className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">
          Assistant
        </div>

        {text ? (
          <MarkdownContent streaming={streaming}>{text}</MarkdownContent>
        ) : streaming ? (
          <div role="status" className="flex gap-1 py-1.5" aria-label="L’assistant rédige…">
            <span className="size-2 animate-pulse rounded-full bg-accent/60" />
            <span className="size-2 animate-pulse rounded-full bg-accent/60 [animation-delay:160ms]" />
            <span className="size-2 animate-pulse rounded-full bg-accent/60 [animation-delay:320ms]" />
          </div>
        ) : null}

        {showSources ? (
          <div className="mt-2.5 animate-fade-in rounded-card border border-border bg-surface-muted/70 px-3 py-2.5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <FileIcon className="size-3.5 text-accent" />
              Sources
              {variant === 'supervision' ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-medium text-accent">
                  <EyeIcon className="size-3" />
                  Visible par vous uniquement
                </span>
              ) : null}
            </p>
            <ul className="space-y-0.5">
              {sources.map((source) => (
                <li key={source.index} className="text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-accent">[{source.index}]</span>{' '}
                  {source.filename}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showMeta ? (
          <div className="mt-1.5 flex items-center gap-2">
            <CopyButton text={text} />
            {typeof tokens === 'number' ? (
              <span className="text-xs text-muted-foreground/80">· {tokens} tokens</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
