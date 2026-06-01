import { type Logger, pino } from 'pino';

export type { Logger };

/**
 * Logger structuré (pino) avec **rédaction** des secrets. Aucune donnée
 * personnelle ni contenu de prompt en clair (cf. §9 du cahier des charges).
 * En dev, sortie lisible via pino-pretty ; en prod, JSON brut.
 */
export function createLogger(nodeEnv: string): Logger {
  const isProd = nodeEnv === 'production';
  return pino({
    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'authorization',
        'apiKey',
        'ALBERT_API_KEY',
        '*.apiKey',
        '*.password',
      ],
      censor: '[rédigé]',
    },
    base: { service: 'edubrain-api' },
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
  });
}
