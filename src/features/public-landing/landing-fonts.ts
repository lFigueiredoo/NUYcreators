import localFont from 'next/font/local';

/**
 * Proposta C — tipografia editorial da landing pública.
 *
 * Playfair Display (títulos) + Inter (corpo/interface) self-hospedadas, como
 * o resto do projeto. Caveat já existe em public/fonts e entra apenas no
 * acento manuscrito herdado da referência ("Mais rotinas boas por aqui.").
 *
 * Declaração independente: nada é importado de `features/community`, cujas
 * fontes continuam servindo auth e área autenticada.
 */
export const display = localFont({
  src: [
    {
      path: '../../../public/fonts/playfair-display-latin.woff2',
      weight: '400 900',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/playfair-display-italic-latin.woff2',
      weight: '400 900',
      style: 'italic',
    },
  ],
  variable: '--pl-font-display',
  display: 'swap',
  weight: '400 900',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

export const body = localFont({
  src: '../../../public/fonts/inter-latin.woff2',
  variable: '--pl-font-body',
  display: 'swap',
  weight: '100 900',
  fallback: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
});

export const script = localFont({
  src: '../../../public/fonts/caveat-latin.woff2',
  variable: '--pl-font-script',
  display: 'swap',
  weight: '400 700',
  fallback: ['Segoe Script', 'cursive'],
});

export const landingFontVariables = `${display.variable} ${body.variable} ${script.variable}`;
