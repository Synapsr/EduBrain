'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './icons';

/** Bascule clair/sombre. Persiste le choix ; le script anti-FOUC l'applique au chargement. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('edubrain-theme', next ? 'dark' : 'light');
    } catch {
      /* localStorage indisponible — sans effet */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      className="inline-flex size-9 items-center justify-center rounded-button border border-border text-muted-foreground transition-all duration-200 hover:bg-surface-muted hover:text-accent active:scale-90"
    >
      {dark ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
    </button>
  );
}
