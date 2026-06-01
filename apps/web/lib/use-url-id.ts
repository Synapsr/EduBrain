'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Synchronise l'identifiant sélectionné (conversation, Cadre, espace élève) avec
 * le paramètre d'URL `?id=` : lien profond, partage et rechargement cohérents.
 * Lit la valeur au montage et réagit aux boutons précédent/suivant du navigateur.
 *
 * `setId(null)` retire le paramètre (retour à la vue d'ensemble). On utilise
 * `replaceState` pour ne pas encombrer l'historique au fil des sélections.
 */
export function useUrlId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setId(new URLSearchParams(window.location.search).get('id'));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const update = useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('id', next);
    else url.searchParams.delete('id');
    window.history.replaceState(window.history.state, '', url);
    setId(next);
  }, []);

  return [id, update];
}
