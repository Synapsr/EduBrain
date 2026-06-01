'use client';

import type { FrameworkInput } from '@edubrain/core/frameworks';
import { useCallback, useEffect, useState } from 'react';
import {
  createFramework,
  deleteFramework,
  duplicateFramework,
  listFrameworks,
  updateFramework,
} from '@/lib/api';
import type { FrameworkDTO } from '@/lib/types';
import { useUrlId } from '@/lib/use-url-id';
import { CadresOverview } from '../_components/cadres-overview';
import { CadresSidebar } from '../_components/cadres-sidebar';
import { DocumentsPanel } from '../_components/documents-panel';
import { FrameworkForm } from '../_components/framework-form';
import { MenuIcon } from '../_components/icons';

/**
 * Application des Cadres — même UX/nav que les conversations : liste latérale +
 * éditeur au centre, tiroir mobile, navigation croisée.
 */
export default function CadresPage() {
  const [frameworks, setFrameworks] = useState<FrameworkDTO[]>([]);
  const [activeId, setActiveId] = useUrlId();
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listFrameworks(controller.signal)
      .then((list) => {
        setFrameworks(list);
        // La sélection vient de l'URL (`?id=`) via useUrlId — lien profond géré.
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // Vue d'ensemble (listing) par défaut ; aucun cadre sélectionné.
  const showOverview = () => {
    setCreating(false);
    setActiveId(null);
    setDrawerOpen(false);
  };

  const refresh = useCallback(async () => {
    setFrameworks(await listFrameworks());
  }, []);

  const handleNew = useCallback(() => {
    setCreating(true);
    setActiveId(null);
    setDrawerOpen(false);
  }, [setActiveId]);

  const handleSelect = useCallback(
    (id: string) => {
      setCreating(false);
      setActiveId(id);
      setDrawerOpen(false);
    },
    [setActiveId],
  );

  const handleSave = useCallback(
    async (input: FrameworkInput) => {
      if (creating) {
        const created = await createFramework(input);
        await refresh();
        setCreating(false);
        setActiveId(created.id);
      } else if (activeId) {
        await updateFramework(activeId, input);
        await refresh();
      }
    },
    [creating, activeId, refresh, setActiveId],
  );

  const handleCancel = useCallback(() => {
    if (creating) {
      setCreating(false);
      setActiveId(null); // annule la création ⇒ vue d'ensemble
    } else {
      setEditorKey((k) => k + 1); // remonte l'éditeur ⇒ annule les modifications
    }
  }, [creating, setActiveId]);

  const handleRename = useCallback(
    async (id: string, name: string) => {
      setFrameworks((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
      try {
        await updateFramework(id, { name });
      } catch {
        refresh();
      }
    },
    [refresh],
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const copy = await duplicateFramework(id).catch(() => null);
      await refresh();
      if (copy) {
        setCreating(false);
        setActiveId(copy.id);
      }
    },
    [refresh, setActiveId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer ce cadre ? Cette action est définitive.')) return;
      setFrameworks((prev) => prev.filter((f) => f.id !== id));
      if (activeId === id) setActiveId(null); // l'élément ouvert disparaît ⇒ vue d'ensemble
      await deleteFramework(id).catch(() => undefined);
      await refresh();
    },
    [activeId, refresh, setActiveId],
  );

  const activeFramework = frameworks.find((f) => f.id === activeId) ?? null;
  const mainTitle = creating ? 'Nouveau cadre' : (activeFramework?.name ?? 'Cadres d’usage');

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className={drawerOpen ? 'fixed inset-0 z-40 md:static md:z-auto' : 'hidden md:block'}>
        {drawerOpen ? (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/30 md:hidden"
          />
        ) : null}
        <div className="relative z-50 h-full">
          <CadresSidebar
            frameworks={frameworks}
            activeId={activeId}
            creating={creating}
            loading={loading}
            onOverview={showOverview}
            onNew={handleNew}
            onSelect={handleSelect}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir les cadres"
            className="inline-flex size-9 items-center justify-center rounded-button border border-border text-muted-foreground hover:bg-surface-muted"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="truncate text-sm font-medium">{mainTitle}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-8">
            {creating || activeFramework ? (
              <section className="animate-fade-in">
                <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">
                  {creating ? 'Nouveau cadre' : `Modifier « ${activeFramework?.name} »`}
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Un Cadre encadre l’assistant : persona, ton, règles, et documents de référence.
                </p>
                <FrameworkForm
                  key={`${activeId ?? 'new'}-${editorKey}`}
                  initial={creating ? null : activeFramework}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  documentsSlot={
                    !creating && activeFramework ? (
                      <DocumentsPanel key={activeFramework.id} frameworkId={activeFramework.id} />
                    ) : undefined
                  }
                />
              </section>
            ) : (
              <CadresOverview
                frameworks={frameworks}
                onOpen={handleSelect}
                onNew={handleNew}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
