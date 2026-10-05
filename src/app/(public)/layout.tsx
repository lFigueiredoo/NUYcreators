import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { currentUser } from '@/lib/appwrite/server';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <>
      <Header authenticated={Boolean(user)} />
      <main id="main" className="public-inner">
        {children}
      </main>
      <Footer />
    </>
  );
}
