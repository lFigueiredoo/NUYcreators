import type { Metadata } from 'next';
import '@/styles/globals.css';
export const metadata: Metadata = {
  title: { default: 'NUY Creators — Crie. Compartilhe. Conquiste.', template: '%s | NUY Creators' },
  description:
    'Uma comunidade para quem transforma rotina, casa e bem-estar em conteúdo que inspira.',
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
