import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

/** Extrait le texte du dernier message utilisateur du prompt (déjà converti). */
function lastUserText(options: LanguageModelV2CallOptions): string {
  for (let i = options.prompt.length - 1; i >= 0; i--) {
    const message = options.prompt[i];
    if (message?.role !== 'user') continue;
    const { content } = message;
    if (typeof content === 'string') return content;
    return content
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  return '';
}

/** Construit la réponse simulée (mode démo) en français, clairement identifiée. */
function demoReply(userText: string): string {
  const quoted = userText.trim().length > 0 ? `\n\n> « ${userText.trim()} »` : '';
  return [
    '**Réponse simulée — mode démo.**',
    "Aucune clé Albert n'est configurée, je ne peux donc pas générer de vraie réponse.",
    `Voici un aperçu de l'expérience à partir de votre demande :${quoted}`,
    'Renseignez `ALBERT_API_KEY` pour obtenir des réponses réelles de l’IA souveraine.',
  ].join('\n\n');
}

const countTokens = (text: string): number => (text.match(/\S+/g) ?? []).length;

/**
 * Provider **mock** (mode démo) implémentant `LanguageModelV2`. Streame une
 * réponse simulée token par token — l'app, le streaming et les tests
 * fonctionnent de bout en bout **sans clé Albert**.
 */
export const echoModel: LanguageModelV2 = {
  specificationVersion: 'v2',
  provider: 'echo',
  modelId: 'echo-demo',
  supportedUrls: {},

  async doGenerate(options) {
    const text = demoReply(lastUserText(options));
    const input = countTokens(lastUserText(options));
    const output = countTokens(text);
    return {
      content: [{ type: 'text', text }],
      finishReason: 'stop',
      usage: { inputTokens: input, outputTokens: output, totalTokens: input + output },
      warnings: [],
    };
  },

  async doStream(options) {
    const userText = lastUserText(options);
    const text = demoReply(userText);
    const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
    const id = 'echo-text-0';
    const input = countTokens(userText);
    const output = countTokens(text);

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });
        controller.enqueue({ type: 'text-start', id });
        for (const token of tokens) {
          await new Promise((resolve) => setTimeout(resolve, 18));
          controller.enqueue({ type: 'text-delta', id, delta: token });
        }
        controller.enqueue({ type: 'text-end', id });
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
          usage: { inputTokens: input, outputTokens: output, totalTokens: input + output },
        });
        controller.close();
      },
    });

    return { stream };
  },
};
