import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import '@/styles/globals.css';
const title = 'NUY Creators — Crie. Compartilhe. Conquiste.';
const description =
  'Uma comunidade para quem transforma rotina, casa e bem-estar em conteúdo que inspira.';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: '%s | NUY Creators' },
  description,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'NUY Creators',
    title,
    description,
  },
  twitter: { card: 'summary', title, description },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main">
          Pular para conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
