import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EduBrain — Assistant IA souverain pour les enseignants',
    template: '%s · EduBrain',
  },
  description:
    'Assistant conversationnel IA pour les enseignants, branché sur Albert (IA souveraine française). Préparation de cours, différenciation, génération d’exercices.',
  applicationName: 'EduBrain',
  authors: [{ name: 'EduBrain' }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#1d1e26' },
  ],
};

/**
 * Script anti-FOUC : applique le thème (clair/sombre) avant le premier rendu,
 * d'après la préférence enregistrée ou celle du système. Un sélecteur visible
 * sera ajouté en M4.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('edubrain-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script d'init de thème (anti-FOUC), contenu statique. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
