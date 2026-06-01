import type { HealthStatus } from '@edubrain/core';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppContext } from '../context';
import { API_VERSION } from '../version';

async function pingDatabase(ctx: AppContext): Promise<HealthStatus['database']> {
  try {
    await ctx.db.execute(sql`select 1`);
    return 'up';
  } catch (err) {
    ctx.logger.warn({ err }, 'health: base de données injoignable');
    return 'down';
  }
}

/** Route `/health` : état du service, mode démo, et joignabilité de la base. */
export function createHealthRoute(ctx: AppContext): Hono {
  const route = new Hono();

  route.get('/health', async (c) => {
    const database = await pingDatabase(ctx);
    const body: HealthStatus = {
      status: 'ok',
      service: 'edubrain-api',
      version: API_VERSION,
      demoMode: ctx.demoMode,
      database,
      timestamp: new Date().toISOString(),
    };
    return c.json(body);
  });

  return route;
}
