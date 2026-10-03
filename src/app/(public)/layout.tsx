import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="public-inner">
        {children}
      </main>
      <Footer />
    </>
  );
}
