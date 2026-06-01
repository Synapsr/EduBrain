import { describe, expect, it } from 'vitest';
import { EnvValidationError, isDemoMode, parseServerEnv } from './env';

const base = { DATABASE_URL: 'postgres://edubrain:edubrain@localhost:5432/edubrain' };

describe('parseServerEnv', () => {
  it('applique les défauts documentés quand seules les variables requises sont fournies', () => {
    const env = parseServerEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.ALBERT_BASE_URL).toBe('https://albert.api.etalab.gouv.fr/v1');
    expect(env.ALBERT_CHAT_MODEL_SMALL).toBe('mistralai/Mistral-Small-3.2-24B-Instruct-2506');
    expect(env.ALBERT_CHAT_MODEL_LARGE).toBe('openai/gpt-oss-120b');
    expect(env.ALBERT_EMBEDDING_MODEL).toBe('BAAI/bge-m3');
    expect(env.ALBERT_EMBEDDING_DIM).toBe(1024);
    expect(env.API_PORT).toBe(8787);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
  });

  it('échoue clairement (EnvValidationError) si DATABASE_URL manque', () => {
    expect(() => parseServerEnv({})).toThrow(EnvValidationError);
    try {
      parseServerEnv({});
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      expect((err as EnvValidationError).issues.join('\n')).toContain('DATABASE_URL');
    }
  });

  it('rejette une ALBERT_BASE_URL non-URL', () => {
    expect(() => parseServerEnv({ ...base, ALBERT_BASE_URL: 'pas-une-url' })).toThrow(
      EnvValidationError,
    );
  });

  it('coerce ALBERT_EMBEDDING_DIM depuis une chaîne en entier', () => {
    const env = parseServerEnv({ ...base, ALBERT_EMBEDDING_DIM: '768' });
    expect(env.ALBERT_EMBEDDING_DIM).toBe(768);
    expect(typeof env.ALBERT_EMBEDDING_DIM).toBe('number');
  });

  it('rejette une dimension d’embedding non positive', () => {
    expect(() => parseServerEnv({ ...base, ALBERT_EMBEDDING_DIM: '0' })).toThrow(
      EnvValidationError,
    );
  });

  it('accepte une clé Albert optionnelle absente (mode démo)', () => {
    const env = parseServerEnv(base);
    expect(env.ALBERT_API_KEY).toBeUndefined();
  });

  it('traite une variable vide (FOO=) comme absente (défauts + optionnels undefined)', () => {
    const env = parseServerEnv({ ...base, ALBERT_API_KEY: '', ALBERT_BASE_URL: '' });
    expect(env.ALBERT_API_KEY).toBeUndefined();
    // le défaut s'applique malgré la chaîne vide
    expect(env.ALBERT_BASE_URL).toBe('https://albert.api.etalab.gouv.fr/v1');
    expect(isDemoMode(env)).toBe(true);
  });
});

describe('isDemoMode', () => {
  it('est vrai sans clé Albert', () => {
    expect(isDemoMode({ ALBERT_API_KEY: undefined })).toBe(true);
  });

  it('est faux avec une clé Albert', () => {
    expect(isDemoMode({ ALBERT_API_KEY: 'sk-albert-xxxx' })).toBe(false);
  });
});
