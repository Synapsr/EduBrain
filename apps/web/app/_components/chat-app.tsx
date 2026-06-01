'use client';

import { fr } from '@edubrain/core';
import { useCallback, useEffect, useState } from 'react';
import {
  createConversation,
  deleteConversation,
  fetchDemoMode,
  listConversations,
  listFrameworks,
  renameConversation,
} from '@/lib/api';
import type { ConversationSummary, FrameworkDTO } from '@/lib/types';
import { useUrlId } from '@/lib/use-url-id';
import { ChatPanel } from './chat-panel';
import { DemoBanner } from './demo-banner';
import { LogoMark, MenuIcon, PlusIcon } from './icons';
import { Sidebar } from './sidebar';

/** Orchestrateur de l'application de chat : liste de conversations + fil actif. */
export function ChatApp() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkDTO[]>([]);
  const [activeId, setActiveId] = useUrlId();
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chargement initial : conversations + cadres + mode démo. La conversation
  // ouverte vient de l'URL (`?id=`) si valide, sinon la plus récente.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [list, demo, fwks] = await Promise.all([
          listConversations(controller.signal),
          fetchDemoMode(controller.signal).catch(() => false),
          listFrameworks(controller.signal).catch(() => []),
        ]);
        setDemoMode(demo);
        setFrameworks(fwks);
        setConversations(list);
        const urlId = new URLSearchParams(window.location.search).get('id');
        if (urlId && list.some((c) => c.id === urlId)) {
          setActiveId(urlId);
        } else if (list.length > 0) {
          setActiveId(list[0]?.id ?? null);
        } else {
          const created = await createConversation({});
          setConversations([created]);
          setActiveId(created.id);
        }
      } catch {
        /* abort ou réseau — l'UI reste utilisable */
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [setActiveId]);

  const refresh = useCallback(async () => {
    try {
      setConversations(await listConversations());
    } catch {
      /* ignore */
    }
  }, []);

  const handleNew = useCallback(async () => {
    setDrawerOpen(false);
    const created = await createConversation({});
    setConversations((prev) => [created, ...prev]);
    setActiveId(created.id);
  }, [setActiveId]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      setDrawerOpen(false);
    },
    [setActiveId],
  );

  // Vue d'ensemble : aucune conversation ouverte (accueil).
  const handleOverview = useCallback(() => {
    setActiveId(null);
    setDrawerOpen(false);
  }, [setActiveId]);

  const handleRename = useCallback(
    async (id: string, title: string) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
      try {
        await renameConversation(id, title);
      } catch {
        refresh();
      }
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer cette conversation ? Cette action est définitive.')) return;
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);
      try {
        await deleteConversation(id);
      } catch {
        refresh();
      }
    },
    [activeId, conversations, refresh, setActiveId],
  );

  // Plus aucune conversation ⇒ en recréer une pour rester utilisable.
  useEffect(() => {
    if (!loading && activeId === null && conversations.length === 0) {
      handleNew();
    }
  }, [loading, activeId, conversations.length, handleNew]);

  const activeTitle = conversations.find((c) => c.id === activeId)?.title ?? fr.app.name;

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar : statique en desktop, tiroir superposé en mobile. */}
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
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            loading={loading}
            onNew={handleNew}
            onOverview={handleOverview}
            onSelect={handleSelect}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir les conversations"
            className="inline-flex size-9 items-center justify-center rounded-button border border-border text-muted-foreground hover:bg-surface-muted"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="truncate text-sm font-medium">{activeTitle}</span>
        </div>

        {demoMode ? <DemoBanner /> : null}

        {activeId ? (
          <ChatPanel
            key={activeId}
            conversationId={activeId}
            frameworks={frameworks}
            onTurnFinished={refresh}
          />
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center" />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="animate-rise-in max-w-md text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-card bg-accent text-accent-foreground shadow-card">
                <LogoMark className="size-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
                Vos conversations
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Reprenez une conversation dans le panneau de gauche, ou démarrez-en une nouvelle.
              </p>
              <button
                type="button"
                onClick={handleNew}
                className="mt-5 inline-flex items-center gap-1.5 rounded-button bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-95"
              >
                <PlusIcon className="size-4" />
                Nouvelle conversation
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
