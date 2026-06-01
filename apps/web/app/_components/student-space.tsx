'use client';

import { fr } from '@edubrain/core';
import type { UIMessage } from 'ai';
import { useCallback, useEffect, useState } from 'react';
import {
  createStudentConversation,
  getStudentAccess,
  listStudentConversations,
  loadStudentConversation,
} from '@/lib/api';
import type { StudentAccessInfo, StudentConversationDTO } from '@/lib/types';
import { LogoMark, PlusIcon, SparkIcon, SpinnerIcon } from './icons';
import { StudentChatThread } from './student-chat-thread';

const storeKey = (token: string) => `edubrain-student:${token}`;

type PanelState =
  | { kind: 'loading' }
  | { kind: 'ready'; messages: UIMessage[] }
  | { kind: 'error' };

function StudentChatPanel({
  token,
  studentId,
  conversationId,
  onTurnFinished,
}: {
  token: string;
  studentId: string;
  conversationId: string;
  onTurnFinished: () => void;
}) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    loadStudentConversation(token, conversationId, studentId, controller.signal)
      .then(({ messages }) => {
        const ui = messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
          metadata: m.metadata ?? undefined,
        })) as unknown as UIMessage[];
        setState({ kind: 'ready', messages: ui });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [token, studentId, conversationId]);

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <SpinnerIcon className="size-4" /> {fr.common.loading}
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {fr.errors.generic}
      </div>
    );
  }
  return (
    <StudentChatThread
      token={token}
      studentId={studentId}
      conversationId={conversationId}
      initialMessages={state.messages}
      onTurnFinished={onTurnFinished}
    />
  );
}

export function StudentSpace({ token }: { token: string }) {
  const [access, setAccess] = useState<StudentAccessInfo | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<StudentConversationDTO[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getStudentAccess(token, controller.signal)
      .then((a) => {
        setAccess(a);
        try {
          const saved = localStorage.getItem(storeKey(token));
          if (saved && a.students.some((s) => s.id === saved)) setStudentId(saved);
        } catch {
          /* localStorage indisponible */
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingAccess(false));
    return () => controller.abort();
  }, [token]);

  // Charge (et crée si vide) les conversations une fois identifié.
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      let list = await listStudentConversations(token, studentId).catch(() => []);
      if (cancelled) return;
      if (list.length === 0) {
        const created = await createStudentConversation(token, studentId).catch(() => null);
        if (created) list = [created];
      }
      if (cancelled) return;
      setConversations(list);
      setActiveConvId(list[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, token]);

  const pick = (id: string) => {
    try {
      localStorage.setItem(storeKey(token), id);
    } catch {
      /* ignore */
    }
    setStudentId(id);
  };

  const reset = () => {
    try {
      localStorage.removeItem(storeKey(token));
    } catch {
      /* ignore */
    }
    setStudentId(null);
    setConversations([]);
    setActiveConvId(null);
  };

  const refreshConvs = useCallback(async () => {
    if (!studentId) return;
    setConversations(await listStudentConversations(token, studentId).catch(() => []));
  }, [studentId, token]);

  const newConversation = useCallback(async () => {
    if (!studentId) return;
    const created = await createStudentConversation(token, studentId).catch(() => null);
    if (created) {
      setConversations((prev) => [created, ...prev]);
      setActiveConvId(created.id);
    }
  }, [studentId, token]);

  if (loadingAccess) {
    return (
      <div className="flex h-dvh items-center justify-center text-muted-foreground">
        <SpinnerIcon className="size-5" />
      </div>
    );
  }

  if (notFound || !access) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-card bg-surface-muted text-muted-foreground">
          <SparkIcon className="size-6" />
        </span>
        <h1 className="mt-2 text-xl font-bold">Lien invalide</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ce lien n’est plus valide. Demandez-en un nouveau à votre enseignant·e.
        </p>
      </div>
    );
  }

  // Écran d'identification (mock du compte élève).
  if (!studentId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md animate-rise-in rounded-card border border-border bg-surface p-7 shadow-pop">
          <span className="inline-flex size-11 items-center justify-center rounded-card bg-accent text-accent-foreground shadow-card">
            <LogoMark className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Bonjour&nbsp;👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Espace <span className="font-medium text-foreground">{access.name}</span> · cadre «{' '}
            {access.frameworkName} ».
          </p>
          <p className="mt-5 text-sm font-medium">Qui es-tu&nbsp;?</p>
          {access.students.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun élève n’est encore inscrit. Demandez à votre enseignant·e.
            </p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {access.students.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => pick(student.id)}
                    className="flex w-full items-center gap-2 rounded-button border border-border bg-background px-3 py-2.5 text-left text-sm font-medium transition-all hover:-translate-y-px hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                  >
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                      {student.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{student.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Démo — données fictives. Plus tard : un vrai compte élève.
          </p>
        </div>
      </div>
    );
  }

  const me = access.students.find((s) => s.id === studentId);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-card bg-accent text-accent-foreground shadow-card">
            <LogoMark className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{access.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Cadre « {access.frameworkName} »
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm font-medium sm:inline">{me?.displayName}</span>
          <button
            type="button"
            onClick={reset}
            className="rounded-button border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Ce n’est pas moi
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={newConversation}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-button border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
        >
          <PlusIcon className="size-3.5" />
          Nouvelle
        </button>
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => setActiveConvId(conversation.id)}
            className={`shrink-0 rounded-button px-2.5 py-1.5 text-xs transition-colors ${
              conversation.id === activeConvId
                ? 'bg-accent-soft font-semibold text-accent'
                : 'text-muted-foreground hover:bg-surface-muted'
            }`}
            title={conversation.title}
          >
            <span className="block max-w-[12rem] truncate">{conversation.title}</span>
          </button>
        ))}
      </div>

      {activeConvId ? (
        <StudentChatPanel
          key={activeConvId}
          token={token}
          studentId={studentId}
          conversationId={activeConvId}
          onTurnFinished={refreshConvs}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <SpinnerIcon className="size-4" />
        </div>
      )}
    </div>
  );
}
