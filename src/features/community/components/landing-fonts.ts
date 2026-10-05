import localFont from 'next/font/local';

export const editorial = localFont({
  src: [
    {
      path: '../../../../public/fonts/cormorant-garamond-latin.woff2',
      weight: '300 700',
      style: 'normal',
    },
    {
      path: '../../../../public/fonts/cormorant-garamond-italic-latin.woff2',
      weight: '300 700',
      style: 'italic',
    },
  ],
  variable: '--font-nuy-editorial',
  display: 'swap',
  weight: '300 700',
});
export const interfaceFont = localFont({
  src: '../../../../public/fonts/dm-sans-latin.woff2',
  variable: '--font-nuy-interface',
  display: 'swap',
  weight: '100 1000',
});
export const handwriting = localFont({
  src: '../../../../public/fonts/caveat-latin.woff2',
  variable: '--font-nuy-handwriting',
  display: 'swap',
  weight: '400 700',
});
export const heroEditorial = localFont({
  src: '../../../../public/fonts/bodoni-moda-regular.ttf',
  variable: '--font-nuy-hero-fashion',
  // Headline serif: block evita o flash de Georgia com métricas diferentes no h1.
  display: 'block',
  weight: '400',
});
