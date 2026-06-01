'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDocument, listDocuments, uploadDocument } from '@/lib/api';
import type { DocumentDTO } from '@/lib/types';
import { PlusIcon, SpinnerIcon, TrashIcon } from './icons';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/** Documents de référence rattachés à un Cadre : dépôt, liste, suppression. */
export function DocumentsPanel({ frameworkId }: { frameworkId: string }) {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setDocuments(await listDocuments(frameworkId, signal));
    },
    [frameworkId],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refresh]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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

      <div className="mt-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          multiple
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-button border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-surface-muted disabled:opacity-60"
        >
          {uploading ? <SpinnerIcon className="size-4" /> : <PlusIcon className="size-4" />}
          {uploading ? 'Analyse en cours…' : 'Déposer un document'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

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
    </section>
  );
}
