import type { LanguageModelV2CallOptions, LanguageModelV2StreamPart } from '@ai-sdk/provider';
import { describe, expect, it } from 'vitest';
import { echoModel } from './echo';

function optionsWith(text: string): LanguageModelV2CallOptions {
  return {
    prompt: [{ role: 'user', content: [{ type: 'text', text }] }],
  } as unknown as LanguageModelV2CallOptions;
}

async function collect(stream: ReadableStream<LanguageModelV2StreamPart>) {
  const parts: LanguageModelV2StreamPart[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  return parts;
}

describe('echoModel (provider mock / mode démo)', () => {
  it('doGenerate renvoie un contenu texte simulé, clairement identifié', async () => {
    const res = await echoModel.doGenerate(optionsWith('Bonjour'));
    const first = res.content[0];
    expect(first?.type).toBe('text');
    expect((first as { type: 'text'; text: string }).text).toContain('mode démo');
    expect(res.finishReason).toBe('stop');
    expect(res.usage.totalTokens).toBeGreaterThan(0);
  });

  it('doStream émet la séquence v5 : stream-start → text-start → text-delta* → text-end → finish', async () => {
    const { stream } = await echoModel.doStream(optionsWith('Idée sur les fractions'));
    const parts = await collect(stream);
    const types = parts.map((p) => p.type);

    expect(types[0]).toBe('stream-start');
    expect(types).toContain('text-start');
    expect(types.filter((t) => t === 'text-delta').length).toBeGreaterThan(0);
    expect(types).toContain('text-end');
    expect(types.at(-1)).toBe('finish');

    const finish = parts.at(-1);
    if (finish?.type !== 'finish') throw new Error('dernière part inattendue');
    expect(finish.usage.totalTokens).toBeGreaterThan(0);

    const full = parts
      .filter(
        (p): p is Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =>
          p.type === 'text-delta',
      )
      .map((p) => p.delta)
      .join('');
    expect(full).toContain('mode démo');
  });
});
