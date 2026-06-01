import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ModelTier } from '@edubrain/core';
import type { ServerEnv } from '@edubrain/core/env';
import { createAlbert } from './albert';
import { echoModel } from './echo';

export { echoModel } from './echo';

export type ChatModelResolver = (tier: ModelTier) => LanguageModelV2;

/**
 * Construit le résolveur de modèle de chat selon le mode :
 *  - **mode démo** (pas de clé) ⇒ provider mock `echoModel` ;
 *  - sinon ⇒ Albert, avec le `model id` correspondant au palier demandé
 *    (`small` par défaut = frugalité).
 *
 * Le provider Albert est instancié une seule fois (réutilisé entre requêtes).
 */
export function createChatModelResolver(env: ServerEnv, demoMode: boolean): ChatModelResolver {
  const albert = demoMode ? null : createAlbert(env);

  return (tier: ModelTier): LanguageModelV2 => {
    if (!albert) return echoModel;
    const modelId = tier === 'large' ? env.ALBERT_CHAT_MODEL_LARGE : env.ALBERT_CHAT_MODEL_SMALL;
    return albert(modelId) as LanguageModelV2;
  };
}
