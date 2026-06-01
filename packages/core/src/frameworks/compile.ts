import type { CompiledFramework, FrameworkConfig } from './types';

const clean = (value: string): string => value.trim();
const cleanList = (values: string[]): string[] => values.map(clean).filter(Boolean);

/**
 * **Compile un Cadre d'usage** en system prompt + garde-fous. Fonction pure et
 * déterministe (testée unitairement) : c'est la colonne vertébrale du produit.
 *
 * Les champs vides sont ignorés proprement (aucun « undefined » dans la sortie).
 * La sortie est toujours en français et rappelle la règle RGPD (aucune donnée
 * personnelle d'élève).
 */
export function compileFramework(config: FrameworkConfig): CompiledFramework {
  const persona = clean(config.persona) || "l'assistant pédagogique d'EduBrain";
  const name = clean(config.name);
  const sections: string[] = [];

  sections.push(
    `Tu es ${persona}, au service d'enseignants francophones${
      name ? ` dans le cadre « ${name} »` : ''
    }.`,
  );

  const context: string[] = [];
  if (clean(config.subject)) context.push(`Matière : ${clean(config.subject)}`);
  if (clean(config.level)) context.push(`Niveau : ${clean(config.level)}`);
  if (context.length > 0) sections.push(`${context.join(' · ')}.`);

  if (clean(config.description)) sections.push(clean(config.description));
  if (clean(config.tone)) sections.push(`Adopte un ton ${clean(config.tone)}.`);
  if (clean(config.programLink)) {
    sections.push(`Référence (programmes / CRCN) : ${clean(config.programLink)}.`);
  }

  const doRules = cleanList(config.doRules);
  const dontRules = cleanList(config.dontRules);

  if (doRules.length > 0) {
    sections.push(`Ce que tu DOIS faire :\n${doRules.map((r) => `- ${r}`).join('\n')}`);
  }
  if (dontRules.length > 0) {
    sections.push(`Ce que tu ne dois JAMAIS faire :\n${dontRules.map((r) => `- ${r}`).join('\n')}`);
  }

  sections.push(
    "Réponds toujours en français. Tu ne traites ni ne demandes aucune donnée personnelle d'élève.",
  );

  return {
    systemPrompt: sections.join('\n\n'),
    guardrails: { do: doRules, dont: dontRules },
  };
}
