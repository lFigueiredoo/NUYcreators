import { AcademyCatalog } from '@/features/academy/components/creator';
import { creatorAcademyCatalog } from '@/features/academy/services/read';
import { workspaceSession } from '@/features/workspace/services/viewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Academia NUY' };

export default async function AcademyPage({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string | string[];
    categoria?: string | string[];
    pagina?: string | string[];
  }>;
}) {
  const { secret } = await workspaceSession();
  const params = await searchParams;
  const search = typeof params.busca === 'string' ? params.busca.slice(0, 120) : '';
  const category = typeof params.categoria === 'string' ? params.categoria.slice(0, 36) : '';
  const requestedPage = typeof params.pagina === 'string' ? Number(params.pagina) : 1;
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000
      ? requestedPage
      : 1;
  const { courses, categories } = await creatorAcademyCatalog(secret, { search, category, page });
  return (
    <AcademyCatalog
      courses={courses}
      categories={categories}
      search={search}
      category={category}
      page={page}
    />
  );
}
