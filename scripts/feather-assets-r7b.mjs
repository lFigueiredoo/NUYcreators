/**
 * R7b — re-crops de para-quem/benefícios (os primeiros errou o alvo):
 * - para-quem-floral: o jasmão branco da ref mora no CANTO INFERIOR-ESQ da
 *   seção (img 0–52 × 806–884, termina antes da hairline 880–882).
 * - benefits-floral: massa floral da coluna esquerda INTEIRA (img 0–48 ×
 *   886–1024) — abaixo da hairline e sempre à esquerda de x49, onde começa
 *   o h2 "Participar abre novas possibilidades." (o crop anterior pegou o
 *   texto "novas" porque invadiu x49+).
 * Ambos: fundo navy assado, feather por borda com rampa smoothstep.
 */
import sharp from 'sharp';

const REF = 'artifacts/round7/review/reference-official.png';
const OUT = 'public/brand/reference';

const smoothstep = (x) => x * x * (3 - 2 * x);

// edges: 'cut' mantém alpha 1 (borda que continua fora/na fronteira da tela);
// número = largura F px do ramp 0→1 no buffer RGBA.
async function featherCrop({ name, left, top, width, height, scale = 4, edges = {} }) {
  const W = width * scale;
  const H = height * scale;
  const raw = await sharp(REF)
    .extract({ left, top, width, height })
    .resize(W, H, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const F = { top: 0, bottom: 0, left: 0, right: 0, ...edges };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 1;
      if (F.top > 0 && smoothstep(Math.min(1, y / F.top)) < 1)
        a = Math.min(a, smoothstep(Math.min(1, y / F.top)));
      if (F.left > 0) a = Math.min(a, smoothstep(Math.min(1, x / F.left)));
      if (F.right > 0) a = Math.min(a, smoothstep(Math.min(1, (W - 1 - x) / F.right)));
      if (F.bottom > 0) a = Math.min(a, smoothstep(Math.min(1, (H - 1 - y) / F.bottom)));
      const i = (y * W + x) * 4 + 3;
      raw[i] = Math.round(raw[i] * a);
    }
  }
  await sharp(raw, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(`${OUT}/${name}`);
  console.log(`${name}: ${W}x${H}`);
}

await featherCrop({
  name: 'para-quem-floral.webp',
  left: 0,
  top: 806,
  width: 52,
  height: 70,
  edges: { top: 28, right: 30 }, // left/bottom = bordas da viewport/fronteira
});

await featherCrop({
  name: 'benefits-floral.webp',
  left: 0,
  top: 886,
  width: 48,
  height: 138,
  edges: { top: 24, right: 34 }, // left/bottom = contínuos (borda da seção)
});

// project-floral-l: o multiply do creme assado marcava retângulo no creme
// #f4eddf — rampas mais longas no topo/direita derretem a fronteira.
await featherCrop({
  name: 'project-floral-l.webp',
  left: 0,
  top: 498,
  width: 62,
  height: 66,
  edges: { top: 60, right: 64 },
});

// how-floral-l: metade NAVY da MESMA flor que atravessa a fronteira
// Projeto→Como (a metade de cima viva no creme é o project-floral-l). A ref
// exibe pétalas + miolo âmbar de 565 a 610img contínuos; left/top cortados
// (viewport / fronteira contínua), direita/base derretem no navy.
await featherCrop({
  name: 'how-floral-l.webp',
  left: 0,
  top: 565,
  width: 52,
  height: 45,
  edges: { right: 44, bottom: 36 },
});

// journey-bouquet-tr-r7: buquê ALARGADO. O crop da R2 (1270,0,96,120) deixava
// de fora as pétalas-suave à esquerda (1242–1270) e o corpo à direita
// (1366–1382img): a impl mostrava ~2/3 da massa, com o miolo deslocado
// ~140css à direita da posição da ref. Novo: 1246–1366img; a direita para
// ANTES do celular (oclusão em ~1383img). Base para em 106img — o arco do nó
// "Ícone" começa ~y110img (a impl desenha os MEDALHÕES por cima do asset;
// incluir o arco gerava ghost duplo) e o fio de luz da ref (y118–125img) nem
// entra no crop.
await featherCrop({
  name: 'journey-bouquet-tr-r7.webp',
  left: 1246,
  top: 0,
  width: 120,
  height: 106,
  edges: { left: 40, right: 56, bottom: 64 },
});
console.log(
  'para-quem-floral.webp: 208x280 | benefits-floral.webp: 192x552 | project-floral-l.webp: 248x264 (T60/R64) | how-floral-l.webp: 208x180 | journey-bouquet-tr-r7.webp: 480x424 (L40/R56/B64)',
);
