import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { makeTestContext } from '../test-utils';

describe('Routes documents — garde-fous', () => {
  it('GET documents : 404 si l’id de Cadre n’est pas un UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/frameworks/pas-un-uuid/documents');
    expect(res.status).toBe(404);
  });

  it('DELETE document : 404 si l’id n’est pas un UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/documents/xyz', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('GET documents de conversation : 404 si l’id n’est pas un UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/conversations/pas-un-uuid/documents');
    expect(res.status).toBe(404);
  });
});
