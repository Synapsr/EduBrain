import type { Database } from '@edubrain/db';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { makeTestContext } from '../test-utils';

/**
 * DB factice : toute requête Drizzle (select/insert/delete…) se résout sur `[]`.
 * Permet d'exercer les chemins « introuvable » (token/élève inconnus) sans base.
 */
function emptyResultDb(): Database {
  const proxy: unknown = new Proxy(() => proxy, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve([]);
      return () => proxy;
    },
  });
  return proxy as Database;
}

describe('POST /api/accesses — validation', () => {
  it('rejette (400) un espace sans Cadre ni nom', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/accesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentNames: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('rejette (400) un frameworkId non-UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/accesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameworkId: 'pas-un-uuid', name: '6e B' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('routes accès — identifiants invalides', () => {
  it('GET /api/accesses/:id renvoie 404 pour un id non-UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/accesses/pas-un-uuid');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/students/:id renvoie 404 pour un id non-UUID', async () => {
    const app = createApp(makeTestContext());
    const res = await app.request('/api/students/pas-un-uuid', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('espace élève (token)', () => {
  it('GET /api/e/:token renvoie 404 pour un token inconnu', async () => {
    const app = createApp(makeTestContext({ db: emptyResultDb() }));
    const res = await app.request('/api/e/token-inconnu');
    expect(res.status).toBe(404);
  });

  it('POST /api/e/:token/chat renvoie 404 (lien invalide) avant toute génération', async () => {
    const app = createApp(makeTestContext({ db: emptyResultDb() }));
    const res = await app.request('/api/e/token-inconnu/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'x', conversationId: 'y', messages: [] }),
    });
    expect(res.status).toBe(404);
  });
});
