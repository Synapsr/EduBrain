'use client';

import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * Rendu Markdown **sanitisé** des réponses de l'assistant (titres, listes, code,
 * tableaux). `rehype-sanitize` neutralise tout HTML dangereux dans la sortie du
 * modèle. `streaming` ajoute un caret clignotant en fin de texte.
 */
export function MarkdownContent({
  children,
  streaming,
}: {
  children: string;
  streaming?: boolean;
}) {
  return (
    <div className={`markdown ${streaming ? 'is-streaming' : ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </Markdown>
    </div>
  );
}
