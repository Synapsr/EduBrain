'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addStudent,
  createAccess,
  deleteAccess,
  getAccess,
  listAccesses,
  listFrameworks,
  removeStudent,
  setAccessActive,
} from '@/lib/api';
import type { AccessDetailDTO, AccessDTO, FrameworkDTO } from '@/lib/types';
import { useUrlId } from '@/lib/use-url-id';
import { AccessCreate } from '../_components/access-create';
import { AccessDetail } from '../_components/access-detail';
import { AccessesOverview } from '../_components/accesses-overview';
import { AccessesSidebar } from '../_components/accesses-sidebar';
import { MenuIcon, SpinnerIcon } from '../_components/icons';

export default function ElevesPage() {
  const [accesses, setAccesses] = useState<AccessDTO[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkDTO[]>([]);
  const [activeId, setActiveId] = useUrlId();
  const [detail, setDetail] = useState<AccessDetailDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listAccesses(controller.signal),
      listFrameworks(controller.signal).catch(() => []),
    ])
      .then(([list, fwks]) => {
        setAccesses(list);
        setFrameworks(fwks);
        // La sélection vient de l'URL (`?id=`) via useUrlId — lien profond géré.
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const reloadDetail = useCallback(
    async (id: string) => {
      const loaded = await getAccess(id).catch(() => null);
      // Lien profond ?id= invalide / espace introuvable ⇒ retour à la vue d'ensemble.
      if (loaded) setDetail(loaded);
      else setActiveId(null);
    },
    [setActiveId],
  );

  // Vue d'ensemble (listing) par défaut : aucun espace sélectionné, pas de création.
  const showOverview = useCallback(() => {
    setCreating(false);
    setActiveId(null);
    setDetail(null);
    setDrawerOpen(false);
  }, [setActiveId]);

  useEffect(() => {
    if (activeId && !creating) {
      setDetail(null);
      reloadDetail(activeId);
    }
  }, [activeId, creating, reloadDetail]);

  const refreshAccesses = useCallback(async () => {
    setAccesses(await listAccesses());
  }, []);

  const handleNew = useCallback(() => {
    setCreating(true);
    setActiveId(null);
    setDetail(null);
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

  const handleCreate = useCallback(
    async (input: { frameworkId: string; name: string; studentNames: string[] }) => {
      const created = await createAccess(input);
      await refreshAccesses();
      setCreating(false);
      setActiveId(created.id);
    },
    [refreshAccesses, setActiveId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer cet espace et ses échanges ? Action définitive.')) return;
      setAccesses((prev) => prev.filter((a) => a.id !== id));
      // Retour à la vue d'ensemble si l'espace supprimé était ouvert.
      if (activeId === id) setActiveId(null);
      await deleteAccess(id).catch(() => undefined);
      await refreshAccesses();
    },
    [activeId, refreshAccesses, setActiveId],
  );

  const handleAddStudent = useCallback(
    async (name: string) => {
      if (!activeId) return;
      await addStudent(activeId, name).catch(() => undefined);
      await reloadDetail(activeId);
      await refreshAccesses();
    },
    [activeId, reloadDetail, refreshAccesses],
  );

  const handleRemoveStudent = useCallback(
    async (id: string) => {
      if (!activeId) return;
      await removeStudent(id).catch(() => undefined);
      await reloadDetail(activeId);
      await refreshAccesses();
    },
    [activeId, reloadDetail, refreshAccesses],
  );

  const handleToggleActive = useCallback(
    async (active: boolean) => {
      if (!activeId) return;
      // Optimiste : reflète l'état immédiatement, puis confirme côté serveur.
      setDetail((prev) => (prev ? { ...prev, active } : prev));
      setAccesses((prev) => prev.map((a) => (a.id === activeId ? { ...a, active } : a)));
      await setAccessActive(activeId, active).catch(() => undefined);
      await reloadDetail(activeId);
      await refreshAccesses();
    },
    [activeId, reloadDetail, refreshAccesses],
  );

  const mainTitle = creating
    ? 'Nouvel espace'
    : (accesses.find((a) => a.id === activeId)?.name ?? 'Espaces élèves');

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
          <AccessesSidebar
            accesses={accesses}
            activeId={activeId}
            creating={creating}
            loading={loading}
            onOverview={showOverview}
            onNew={handleNew}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir les espaces"
            className="inline-flex size-9 items-center justify-center rounded-button border border-border text-muted-foreground hover:bg-surface-muted"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="truncate text-sm font-medium">{mainTitle}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 py-8">
            {creating ? (
              <AccessCreate
                frameworks={frameworks}
                onCreate={handleCreate}
                onCancel={showOverview}
              />
            ) : activeId && detail ? (
              <AccessDetail
                access={detail}
                onAddStudent={handleAddStudent}
                onRemoveStudent={handleRemoveStudent}
                onToggleActive={handleToggleActive}
              />
            ) : activeId && !detail ? (
              <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
                <SpinnerIcon className="size-4" /> Chargement…
              </div>
            ) : loading ? (
              <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
                <SpinnerIcon className="size-4" /> Chargement…
              </div>
            ) : (
              <AccessesOverview
                accesses={accesses}
                onOpen={handleSelect}
                onNew={handleNew}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
