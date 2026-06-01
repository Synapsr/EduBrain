import { APICallError } from '@ai-sdk/provider';
import { fr } from '@edubrain/core';
import { describe, expect, it } from 'vitest';
import { describeChatError } from './errors';

function apiError(statusCode: number, isRetryable = false): APICallError {
  return new APICallError({
    message: 'erreur API',
    url: 'https://albert.api.etalab.gouv.fr/v1/chat/completions',
    requestBodyValues: {},
    statusCode,
    isRetryable,
  });
}

describe('describeChatError — messages français, dégradation gracieuse', () => {
  it('429 → limite de débit', () => {
    expect(describeChatError(apiError(429))).toBe(fr.errors.rateLimited);
  });

  it('504 / 408 → timeout', () => {
    expect(describeChatError(apiError(504))).toBe(fr.errors.timeout);
    expect(describeChatError(apiError(408))).toBe(fr.errors.timeout);
  });

  it('5xx → service indisponible', () => {
    expect(describeChatError(apiError(503))).toBe(fr.errors.albertUnavailable);
  });

  it('AbortError → timeout', () => {
    const err = new Error('annulé');
    err.name = 'AbortError';
    expect(describeChatError(err)).toBe(fr.errors.timeout);
  });

  it('erreur réseau (fetch) → message réseau', () => {
    expect(describeChatError(new Error('fetch failed'))).toBe(fr.errors.network);
  });

  it('erreur inconnue → message générique', () => {
    expect(describeChatError(new Error('boom'))).toBe(fr.errors.generic);
    expect(describeChatError('pas une erreur')).toBe(fr.errors.generic);
  });
});
