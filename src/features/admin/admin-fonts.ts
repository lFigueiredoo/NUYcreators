import localFont from 'next/font/local';

/**
 * Tipografia da operação.
 *
 * A referência do Moça Lovers usa Andes Rounded, uma família proprietária. A
 * área administrativa usa DM Sans, que já está self-hosted no projeto e tem
 * licença OFL: mantém o desenho arredondado e acolhedor sem copiar o arquivo da
 * marca de referência, e continua legível em tabelas, filtros e números.
 */
export const adminFont = localFont({
  src: '../../../public/fonts/dm-sans-latin.woff2',
  variable: '--adm-font',
  display: 'swap',
  weight: '100 1000',
  fallback: ['Nunito Sans', 'Avenir Next', 'Segoe UI', 'sans-serif'],
});
