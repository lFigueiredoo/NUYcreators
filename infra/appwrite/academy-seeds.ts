/** Proposal only. Never imported by a provisioner or run against a remote project. */
export const academyCategorySeeds = [
  { id: 'cat-primeiros-passos', slug: 'primeiros-passos', name: 'Primeiros passos', order: 10 },
  { id: 'cat-criacao-de-conteudo', slug: 'criacao-de-conteudo', name: 'Criação de conteúdo', order: 20 },
  { id: 'cat-produtos-nuy', slug: 'produtos-nuy', name: 'Produtos NUY', order: 30 },
  { id: 'cat-vendas-e-divulgacao', slug: 'vendas-e-divulgacao', name: 'Vendas e divulgação', order: 40 },
  { id: 'cat-boas-praticas', slug: 'boas-praticas', name: 'Boas práticas', order: 50 },
] as const;

export type ExistingCategory = { $id: string; slug: string };
export function planAcademyCategorySeeds(existing: readonly ExistingCategory[]) {
  const pending: typeof academyCategorySeeds[number][] = [];
  const conflicts: string[] = [];
  for (const seed of academyCategorySeeds) {
    const sameId = existing.find((row) => row.$id === seed.id);
    const sameSlug = existing.find((row) => row.slug === seed.slug);
    if ((sameId && sameId.slug !== seed.slug) || (sameSlug && sameSlug.$id !== seed.id)) {
      conflicts.push(seed.slug);
    } else if (!sameId) {
      pending.push(seed);
    }
  }
  return { pending, conflicts };
}
