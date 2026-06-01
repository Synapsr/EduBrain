import type { HealthStatus } from '@edubrain/core';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { makeTestContext as testContext } from './test-utils';

describe('API EduBrain — santé & garde-fous', () => {
  it('GET / répond 200', async () => {
    const app = createApp(testContext());
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('EduBrain API');
  });

  it('GET /health renvoie un statut structuré, mode démo, base "down" si injoignable', async () => {
    const app = createApp(testContext());
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthStatus;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('edubrain-api');
    expect(body.demoMode).toBe(true);
    expect(body.database).toBe('down');
    expect(typeof body.timestamp).toBe('string');
  });

  it('reflète demoMode=false quand une clé est présente', async () => {
    const app = createApp(testContext({ demoMode: false }));
    const res = await app.request('/health');
    const body = (await res.json()) as HealthStatus;
    expect(body.demoMode).toBe(false);
  });

  it('renvoie 404 JSON pour une route inconnue', async () => {
    const app = createApp(testContext());
    const res = await app.request('/inconnu');
    expect(res.status).toBe(404);
    expect((await res.json()) as { error: string }).toHaveProperty('error');
  });
});
