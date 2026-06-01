'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatBubbleIcon, SparkIcon, UsersIcon } from './icons';

const SECTIONS = [
  { href: '/', label: 'Conversations', icon: ChatBubbleIcon },
  { href: '/cadres', label: 'Cadres d’usage', icon: SparkIcon },
  { href: '/eleves', label: 'Espaces élèves', icon: UsersIcon },
] as const;

const itemClass = (active: boolean) =>
  `flex w-full items-center gap-2 rounded-button px-3 py-2 text-sm transition-colors duration-200 ${
    active
      ? 'bg-accent-soft font-semibold text-accent'
      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
  }`;

/**
 * Navigation principale partagée par les trois sections (conversations, Cadres,
 * espaces élèves). La section courante est mise en évidence ; cliquer dessus
 * revient à sa vue d'ensemble (`onResetActive`). Cohérence + lisibilité de la nav.
 */
export function SectionNav({ onResetActive }: { onResetActive?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="space-y-1">
      {SECTIONS.map((section) => {
        const active = section.href === '/' ? pathname === '/' : pathname.startsWith(section.href);
        const Icon = section.icon;
        return active ? (
          <button
            key={section.href}
            type="button"
            aria-current="page"
            onClick={onResetActive}
            className={itemClass(true)}
          >
            <Icon className="size-4" />
            {section.label}
          </button>
        ) : (
          <Link key={section.href} href={section.href} className={itemClass(false)}>
            <Icon className="size-4" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
