/**
 * Requisitos de desafio — `challenge_requirements.configJson` é texto JSON
 * livre no schema. Este módulo só descreve o que existe: nunca completa
 * requisito ausente nem interpreta chave desconhecida.
 */
export type RequirementConfig = Record<string, unknown>;

export function parseRequirementConfig(value: unknown): RequirementConfig | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as RequirementConfig;
  } catch {
    return null;
  }
}

function primitive(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.length > 0) {
    const parts = value.map(primitive).filter((part): part is string => part !== null);
    return parts.length === value.length ? parts.join(', ') : null;
  }
  return null;
}

/** Pares legíveis para exibição. Estruturas aninhadas são omitidas, não impressas. */
export function configEntries(config: RequirementConfig | null) {
  if (!config) return [];
  return Object.entries(config)
    .map(([key, value]) => ({ key, value: primitive(value) }))
    .filter(
      (entry): entry is { key: string; value: string } =>
        entry.value !== null && entry.value !== '',
    );
}

/**
 * Nome de exibição do requisito. O schema não publica vocabulário fechado para
 * `challenge_requirements.type`, então tipo desconhecido aparece como está —
 * traduzir por conta própria seria inventar requisito que ninguém cadastrou.
 */
const REQUIREMENT_LABELS: Record<string, string> = {
  format: 'Formato do conteúdo',
  hashtag: 'Hashtag obrigatória',
  mention: 'Marcação obrigatória',
  min_duration_seconds: 'Duração mínima (segundos)',
  min_slides: 'Mínimo de slides',
  caption: 'Legenda',
  link: 'Link na publicação',
};

export function requirementLabel(type: string) {
  return REQUIREMENT_LABELS[type] ?? type;
}
