import 'server-only';
import { Query } from 'node-appwrite';
import type { Level } from '../domain/levels';
import { integer, listSession, optionalInteger, text, type Document } from './read';

const SCOPE = 'niveis';

function mapLevel(document: Document): Level {
  return {
    id: text(document.$id),
    name: text(document.name),
    minPoints: integer(document.minPoints),
    maxPoints: optionalInteger(document.maxPoints),
    order: integer(document.order),
  };
}

/**
 * Níveis publicados — `creator_levels` é leitura pública de configuração
 * (docs/database.md §Permissões), então não depende de documento da usuária.
 *
 * Se a leitura não estiver disponível devolvemos lista vazia e a UI
 * simplesmente não mostra progresso de nível: melhor não exibir nada do que
 * derivar faixas hardcoded no frontend, que é justamente o que a arquitetura
 * proíbe.
 */
export async function loadLevels(secret: string): Promise<Level[]> {
  const result = await listSession(secret, SCOPE, 'creator_levels', mapLevel, {
    queries: [Query.equal('active', true)],
  });
  if (result.state !== 'ok') return [];
  return [...result.items].sort((a, b) => a.order - b.order || a.minPoints - b.minPoints);
}
