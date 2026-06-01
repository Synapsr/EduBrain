import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { makeTestContext } from '../test-utils';

async function postFramework(body: unknown) {
  const app = createApp(makeTestContext());
  return app.request('/api/frameworks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/frameworks — validation', () => {
  it('rejette (400) un Cadre sans nom', async () => {
    const res = await postFramework({ description: 'sans nom' });
    expect(res.status).toBe(400);
  });

  it('rejette (400) une visibilité inconnue', async () => {
    const res = await postFramework({ name: 'Test', visibility: 'public' });
    expect(res.status).toBe(400);
  });

  it('renvoie 404 pour un id de Cadre non-UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/frameworks/pas-un-uuid');
    expect(res.status).toBe(404);
  });
});
