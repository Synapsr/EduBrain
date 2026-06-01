'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { CheckIcon } from './icons';

export interface MenuOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Menu déroulant accessible (popover) — alternative élégante au `<select>`.
 * Ouvre au-dessus du déclencheur (composer en bas d'écran). Ferme au clic
 * extérieur / Échap. Items en `menuitemradio` avec `aria-checked`.
 */
export function PopoverMenu({
  label,
  trigger,
  options,
  value,
  onChange,
  align = 'left',
  active = false,
  footer,
}: {
  label: string;
  trigger: ReactNode;
  options: MenuOption[];
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'right';
  active?: boolean;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          open || active
            ? 'border-accent/40 bg-accent-soft text-accent'
            : 'border-border bg-surface-muted text-muted-foreground hover:bg-border/40 hover:text-foreground'
        }`}
      >
        {trigger}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute bottom-full z-30 mb-2 min-w-[15rem] origin-bottom animate-pop-in overflow-hidden rounded-card border border-border bg-surface p-1 shadow-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                  selected ? 'bg-accent-soft' : 'hover:bg-surface-muted'
                }`}
              >
                <span className="mt-0.5 size-4 shrink-0">
                  {selected ? <CheckIcon className="size-4 text-accent" /> : null}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm ${selected ? 'font-semibold text-accent' : 'text-foreground'}`}
                  >
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {footer ? <div className="mt-1 border-t border-border pt-1">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
