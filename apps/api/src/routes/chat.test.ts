import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { makeTestContext } from '../test-utils';

const userMessage = { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Bonjour' }] };

async function post(body: unknown) {
  const app = createApp(makeTestContext());
  return app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat — validation (sécurité)', () => {
  it('rejette (400) un corps sans messages', async () => {
    const res = await post({ conversationId: '07ef3e9f-473b-45ad-a609-3b824ec94299' });
    expect(res.status).toBe(400);
  });

  it('rejette (400) un conversationId non-UUID', async () => {
    const res = await post({ conversationId: 'pas-un-uuid', messages: [userMessage] });
    expect(res.status).toBe(400);
  });

  it('rejette (400) une liste de messages vide', async () => {
    const res = await post({
      conversationId: '07ef3e9f-473b-45ad-a609-3b824ec94299',
      messages: [],
    });
    expect(res.status).toBe(400);
  });
});
