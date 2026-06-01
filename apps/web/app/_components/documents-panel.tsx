'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDocument, listDocuments, uploadDocument } from '@/lib/api';
import type { DocumentDTO } from '@/lib/types';
import { LockIcon, PlusIcon, SpinnerIcon, TrashIcon } from './icons';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/**
 * Documents de référence rattachés à un Cadre : dépôt, liste, suppression.
 * `locked` (pendant la création d'un Cadre, avant son enregistrement) : la
 * section reste visible mais floutée/désactivée, avec un message explicatif.
 */
export function DocumentsPanel({
  frameworkId,
  locked = false,
}: {
  frameworkId?: string;
  locked?: boolean;
}) {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!frameworkId) return;
      setDocuments(await listDocuments(frameworkId, signal));
    },
    [frameworkId],
  );

  useEffect(() => {
    if (locked || !frameworkId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    refresh(controller.signal)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refresh, locked, frameworkId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !frameworkId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) await uploadDocument(frameworkId, file);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’envoi.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDelete = async (id: string) => {
    await deleteDocument(id).catch(() => undefined);
    await refresh();
  };

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-bold">Documents de référence</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        PDF, texte ou markdown. L’assistant s’appuie sur ces documents pour répondre et cite ses
        sources.
      </p>

      <div className="relative mt-4">
        <div
          aria-hidden={locked || undefined}
          className={locked ? 'pointer-events-none select-none blur-[3px] opacity-50' : undefined}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            multiple
            disabled={locked}
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || locked}
            className="inline-flex items-center gap-1.5 rounded-button border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-surface-muted disabled:opacity-60"
          >
            {uploading ? <SpinnerIcon className="size-4" /> : <PlusIcon className="size-4" />}
            {uploading ? 'Analyse en cours…' : 'Déposer un document'}
          </button>

          {error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {locked ? (
            // Aperçu factice (squelette) pour donner à voir la section à venir.
            <ul className="mt-3 divide-y divide-border">
              {['•••••••••.pdf', '••••••.txt'].map((label) => (
                <li key={label} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">— · — passage(s)</p>
                  </div>
                  <TrashIcon className="size-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SpinnerIcon className="size-4" /> Chargement…
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document pour ce cadre.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{document.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(document.sizeBytes)} · {document.chunkCount} passage(s)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDelete(document.id)}
                        aria-label={`Supprimer ${document.filename}`}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-button text-muted-foreground hover:bg-surface-muted hover:text-danger"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-card bg-surface/55 text-center">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-muted text-muted-foreground shadow-card">
              <LockIcon className="size-4" />
            </span>
            <p className="text-sm font-semibold text-foreground">Enregistrez d’abord le cadre</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Vous pourrez ensuite y ajouter des documents de référence.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
