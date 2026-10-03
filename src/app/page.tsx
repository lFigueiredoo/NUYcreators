import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PublicMotion } from '@/features/community/components/public-motion';
import { Landing } from '@/features/community/components/landing';
import { getPublicLevels } from '@/features/community/services/public-data';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const data = await getPublicLevels();
  return (
    <>
      <Header />
      <PublicMotion />
      <main id="main">
        <Landing levels={data.levels} status={data.status} />
      </main>
      <Footer />
    </>
  );
}
