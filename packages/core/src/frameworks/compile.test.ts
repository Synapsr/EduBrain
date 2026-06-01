import { describe, expect, it } from 'vitest';
import { compileFramework } from './compile';
import { SEED_FRAMEWORKS } from './seeds';
import type { FrameworkConfig } from './types';

const base: FrameworkConfig = {
  name: 'Préparation de séance',
  description: 'Aide à concevoir une séance.',
  subject: 'Mathématiques',
  level: 'CM1',
  programLink: 'BO cycle 3',
  persona: 'un concepteur pédagogique',
  tone: 'clair et structuré',
  doRules: ['Formuler des objectifs', 'Structurer en phases'],
  dontRules: ['Ne pas inventer de références'],
};

describe('compileFramework', () => {
  it('intègre persona, matière, niveau, ton et description dans le system prompt', () => {
    const { systemPrompt } = compileFramework(base);
    expect(systemPrompt).toContain('un concepteur pédagogique');
    expect(systemPrompt).toContain('cadre « Préparation de séance »');
    expect(systemPrompt).toContain('Matière : Mathématiques');
    expect(systemPrompt).toContain('Niveau : CM1');
    expect(systemPrompt).toContain('ton clair et structuré');
    expect(systemPrompt).toContain('BO cycle 3');
  });

  it('liste les règles DOIS / JAMAIS et les expose en garde-fous', () => {
    const { systemPrompt, guardrails } = compileFramework(base);
    expect(systemPrompt).toContain('Ce que tu DOIS faire :');
    expect(systemPrompt).toContain('- Formuler des objectifs');
    expect(systemPrompt).toContain('Ce que tu ne dois JAMAIS faire :');
    expect(systemPrompt).toContain('- Ne pas inventer de références');
    expect(guardrails.do).toEqual(['Formuler des objectifs', 'Structurer en phases']);
    expect(guardrails.dont).toEqual(['Ne pas inventer de références']);
  });

  it('rappelle toujours le français et le RGPD (aucune donnée d’élève)', () => {
    const { systemPrompt } = compileFramework(base);
    expect(systemPrompt).toContain('en français');
    expect(systemPrompt.toLowerCase()).toContain("donnée personnelle d'élève");
  });

  it('gère proprement les champs vides (pas de "undefined", persona par défaut)', () => {
    const empty: FrameworkConfig = {
      name: '',
      description: '',
      subject: '',
      level: '',
      programLink: '',
      persona: '',
      tone: '',
      doRules: ['  ', ''],
      dontRules: [],
    };
    const { systemPrompt, guardrails } = compileFramework(empty);
    expect(systemPrompt).not.toContain('undefined');
    expect(systemPrompt).toContain("l'assistant pédagogique d'EduBrain");
    expect(systemPrompt).not.toContain('Matière :');
    expect(systemPrompt).not.toContain('DOIS faire'); // règles vides filtrées
    expect(guardrails.do).toEqual([]);
  });

  it('le Cadre « Mode socratique » interdit explicitement de donner la réponse finale', () => {
    const socratique = SEED_FRAMEWORKS.find((f) => f.name === 'Mode socratique');
    expect(socratique).toBeDefined();
    if (!socratique) return;
    const { systemPrompt } = compileFramework(socratique);
    expect(systemPrompt).toContain('JAMAIS');
    expect(systemPrompt.toLowerCase()).toContain('réponse finale');
  });
});
