import sharp from 'sharp';

/**
 * Experiências (seção 06) — slot editorial em resolução real.
 * Fonte: public/brand/product-concept.webp (930×1011, resolução nativa).
 * Recorte 688×880 = proporção exata 43/55 da moldura em arco.
 * Janelas excluídas de propósito:
 *  - caligrafia "Mais que limpeza, é uma aura" (x ≥ ~695, y 140–330);
 *  - legenda embutida "Recompensas reais" (y ≥ 930).
 * Exibição máxima do slot: 460px de largura — 688px naturais = margem, sem
 * ampliação em DPR 1 (regra de fidelidade da landing).
 */
const crop = { left: 0, top: 28, width: 688, height: 880 };
await sharp('public/brand/product-concept.webp')
  .extract(crop)
  .sharpen({ sigma: 0.6 })
  .webp({ quality: 94 })
  .toFile('public/brand/reference/experience-editorial-688.webp');
console.log('experience-editorial-688.webp escrito');
