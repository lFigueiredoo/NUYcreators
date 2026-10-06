/**
 * Proposta C · Checkpoint 3 — comparações lado a lado das seções 06 e 07.
 *
 * A prancha "Imagens a utilizar" (1122×1402) é folha de especificação, não mock
 * de página: seus blocos são miniaturas. Regra da folha, sem exceção —
 *
 *   a REFERÊNCIA aparece sempre 1:1 (nunca ampliada);
 *   a IMPLEMENTAÇÃO aparece 1:1 quando é do mesmo porte; quando é maior, é
 *   reduzida até a largura da referência. Reduzir, nunca ampliar.
 *
 * Por isso a comparação da seção 06 é também uma prova de resolução: o bitmap
 * servido (958px no slot de 958) é reduzido até o bloco da prancha, e a foto
 * continua nítida.
 *
 * A geometria da implementação não é digitada aqui: vem do `probe.json` que a
 * captura escreve, medido pelo próprio navegador (getBoundingClientRect).
 *
 * Caixas da prancha — lidas na régua de 100px e conferidas pelo script
 * `pc-cp3-plate-check.mjs`, que desenha cada uma de volta na prancha:
 *   item2 294,488 263×272   foto de packshot (findBand)
 *   item4  22,780 556×358   mosaico "Casa e bem-estar" (corte 1:1 da junção 4|5
 *                           mostra o mosaico terminando em x=578 contra o
 *                           banner navy, e em y=1138 contra a fileira mobile)
 *   item6 284,1145 820×252  fileira mobile (cards creme sobre creme: nenhuma
 *                           varredura acha — ler na régua)
 *   card  647,1160 120×160  card "Recompensas reais" da prancha 6 (idem)
 */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const OUT = 'artifacts/proposta-c/checkpoint-3';
const CROPS = 'artifacts/proposta-c/crops';
const SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_36_04-7.png';
const CREAM = { r: 249, g: 245, b: 239, alpha: 1 };
const INK = '#0e2a44';
const MUTED = '#4a6076';
const RULE = '#c7a1b3';

const BAR = 60; // barra de faixa
const CAP = 30; // legenda de item
const PAD = 40;

const CAIXAS = {
  item2: { left: 294, top: 488, width: 263, height: 272 },
  item4: { left: 22, top: 780, width: 556, height: 358 },
  item6: { left: 284, top: 1145, width: 820, height: 252 },
  card: { left: 647, top: 1160, width: 120, height: 160 },
};

await mkdir(CROPS, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (w, h, corpo) =>
  Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${corpo}</svg>`);

/** Barra de faixa: rótulo à esquerda, nota à direita. */
const faixa = (w, esq, dir) =>
  svg(
    w,
    BAR,
    `<rect width="${w}" height="${BAR}" fill="rgb(${CREAM.r},${CREAM.g},${CREAM.b})"/>
     <rect x="0" y="${BAR - 2}" width="${w}" height="2" fill="${RULE}"/>
     <text x="${PAD}" y="${BAR / 2 + 7}" font-family="Georgia, serif" font-size="25" fill="${INK}">${esc(esq)}</text>
     <text x="${w - PAD}" y="${BAR / 2 + 7}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${MUTED}">${esc(dir)}</text>`,
  );

/** Legenda embaixo de cada item: o que é e em que escala saiu. */
const legenda = (w, texto) =>
  svg(
    w,
    CAP,
    `<text x="0" y="20" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${MUTED}">${esc(texto)}</text>`,
  );

/** Reduz para a largura alvo; recusa ampliar (a regra é a regra). */
async function reduzir(buf, larguraAlvo, origem) {
  const meta = await sharp(buf).metadata();
  if (meta.width <= larguraAlvo)
    return { buf: await sharp(buf).png().toBuffer(), k: 1, w: meta.width ?? 0 };
  const k = larguraAlvo / (meta.width ?? 1);
  const out = await sharp(buf).resize({ width: larguraAlvo, kernel: 'lanczos3' }).png().toBuffer();
  const m2 = await sharp(out).metadata();
  console.log(`  reduz ${origem}: ${meta.width}→${m2.width} (k=${k.toFixed(3)})`);
  return { buf: out, k, w: m2.width ?? 0 };
}

const relatorio = JSON.parse(await readFile(`${OUT}/probe.json`, 'utf8'));
const p1920 = relatorio['1920'].probe;
const impl = await sharp(`${OUT}/implementation-1920.png`).metadata();
const W = impl.width ?? 1920;

const ref = {};
for (const [nome, box] of Object.entries(CAIXAS)) {
  const buf = await sharp(SHEET).extract(box).png().toBuffer();
  ref[nome] = { buf, ...box };
  await sharp(buf).toFile(`${CROPS}/ref-${nome}.png`);
}

/**
 * Monta uma folha: faixas de título e, dentro de cada uma, itens lado a lado
 * com legenda embaixo. Itens entram sempre top-alinhados.
 */
async function folha(destino, blocos) {
  const ops = [];
  let y = 0;
  for (const bloco of blocos) {
    if (bloco.titulo) {
      ops.push({ input: faixa(W, bloco.titulo, bloco.nota ?? ''), top: y, left: 0 });
      y += BAR;
      const altura = Math.max(...bloco.itens.map((i) => i.h));
      let x = PAD;
      for (const item of bloco.itens) {
        ops.push({ input: item.buf, top: y, left: x });
        ops.push({ input: legenda(item.w, item.legenda), top: y + item.h + 6, left: x });
        x += item.w + PAD;
      }
      y += altura + CAP + 12;
    } else {
      ops.push({ input: bloco.buf, top: y, left: bloco.left ?? 0 });
      y += bloco.h;
    }
  }
  await sharp({ create: { width: W, height: y, channels: 4, background: CREAM } })
    .composite(ops)
    .png()
    .toFile(`${OUT}/${destino}`);
  console.log(`${destino} ${W}x${y}\n`);
}

const recortar = async (arquivo, box) => sharp(arquivo).extract(box).png().toBuffer();

// ---------------------------------------------------------- 06 · comunidade
{
  const secFile = `${OUT}/06-community-1920.png`;
  const secM = await sharp(secFile).metadata();

  // A foto entra recortada da própria captura: nada de re-render, a caixa é a
  // que o navegador mediu (`probe.json`), convertida para o recorte da seção.
  const foto = await recortar(secFile, {
    left: p1920.communityMedia.x - p1920.community.x,
    top: p1920.communityMedia.y - p1920.community.y,
    width: p1920.communityMedia.w,
    height: p1920.communityMedia.h,
  });
  const fotoMeta = await sharp(foto).metadata();
  const fotoReduz = await reduzir(foto, ref.item4.width, 'foto 06 → bloco da prancha');

  // Fileira mobile a 390 CSS px: a captura está em DPR 2, então 780 px físicos
  // são exatamente 390 CSS — ela entra 1:1 ao lado da fileira da prancha.
  const sec390 = await sharp(`${OUT}/06-community-390.png`).metadata();

  console.log(
    '06 · medidas:',
    JSON.stringify({
      blocoPrancha: `${ref.item4.width}x${ref.item4.height}`,
      fotoSecao: `${fotoMeta.width}x${fotoMeta.height}`,
      secao390: `${sec390.width}x${sec390.height} (DPR 2 = 390 CSS)`,
    }),
  );

  await folha('comparison-06-community.png', [
    {
      titulo: 'Referência — prancha “4. Casa e bem-estar” × foto da seção 06 na MESMA largura',
      nota: `prancha 1:1 · foto em 1920 reduzida ${ref.item4.width}/${fotoMeta.width} = ${(ref.item4.width / fotoMeta.width).toFixed(2)}×`,
      itens: [
        {
          buf: ref.item4.buf,
          w: ref.item4.width,
          h: ref.item4.height,
          legenda: `prancha “4. Casa e bem-estar” — mosaico de 4 fotos, 1:1 (${ref.item4.width}×${ref.item4.height})`,
        },
        {
          buf: fotoReduz.buf,
          w: fotoReduz.w,
          h: Math.round(fotoMeta.height * fotoReduz.k),
          legenda: `foto da seção 06 — bitmap servido ${fotoMeta.width}px reduzido a ${fotoReduz.w}px (${fotoReduz.k.toFixed(2)}×), nunca ampliado`,
        },
      ],
    },
    {
      titulo: 'Referência — prancha “6. Mobile/comunidade” × seção 06 a 390 CSS px',
      nota: 'as duas 1:1 · a captura mobile está em DPR 2 (780 px físicos = 390 CSS)',
      itens: [
        {
          buf: ref.item6.buf,
          w: ref.item6.width,
          h: ref.item6.height,
          legenda: `prancha “6. Mobile/comunidade” — fileira mobile 1:1 (${ref.item6.width}×${ref.item6.height})`,
        },
        {
          buf: await sharp(`${OUT}/06-community-390.png`).png().toBuffer(),
          w: sec390.width ?? 0,
          h: sec390.height ?? 0,
          legenda: `seção 06 a 390 CSS px — captura DPR 2, 1:1 (${sec390.width}×${sec390.height} px físicos)`,
        },
      ],
    },
    {
      titulo: 'Implementação — seção 06 · 1920 CSS px, escala 1:1',
      nota: `copy oficial verbatim · seção de ${p1920.community.h}px · página de ${impl.height}px`,
      itens: [
        {
          buf: await sharp(secFile).png().toBuffer(),
          w: secM.width ?? 0,
          h: secM.height ?? 0,
          legenda:
            'seção 06 completa em 1920 — copy à esquerda na régua, fotografia ocupando a direita',
        },
      ],
    },
  ]);
}

// --------------------------------------------------------- 07 · recompensas
{
  const secFile = `${OUT}/07-rewards-1920.png`;
  const secM = await sharp(secFile).metadata();

  // Caixas dos cards e da fileira: medidas pelo navegador, não estimadas.
  const cards = p1920.rewardCards;
  const imgH = p1920.rewardImages[0].h;
  const cardW = Math.round(cards[0].w);
  const recorteCard = (i) =>
    recortar(secFile, {
      left: cards[i].x - p1920.rewards.x,
      top: cards[i].y - p1920.rewards.y,
      width: cardW,
      height: imgH,
    });
  const fileira = await recortar(secFile, {
    left: cards[0].x - p1920.rewards.x,
    top: cards[0].y - p1920.rewards.y,
    width: cards[2].x + cards[2].w - cards[0].x - 1,
    height: imgH,
  });
  const fileiraMeta = await sharp(fileira).metadata();

  const card1 = await reduzir(
    await recorteCard(0),
    ref.item2.width,
    'card 1 → largura do packshot',
  );

  console.log(
    '07 · medidas:',
    JSON.stringify({
      blocoPrancha: `${ref.item2.width}x${ref.item2.height}`,
      cards: cards.map((c) => `${c.w}x${c.h}`),
      fileira: `${fileiraMeta.width}x${fileiraMeta.height}`,
    }),
  );

  await folha('comparison-07-rewards.png', [
    {
      titulo: 'Referência — prancha “2. Packshot de produtos” × card 1 na MESMA largura',
      nota: `prancha 1:1 · card reduzido ${ref.item2.width}/${cardW} = ${(ref.item2.width / cardW).toFixed(2)}×`,
      itens: [
        {
          buf: ref.item2.buf,
          w: ref.item2.width,
          h: ref.item2.height,
          legenda: `prancha “2. Packshot de produtos” — 1:1 (${ref.item2.width}×${ref.item2.height})`,
        },
        {
          buf: card1.buf,
          w: card1.w,
          h: Math.round(imgH * card1.k),
          legenda: `card “Produtos NUY” — recorte nativo de 814px exibido em ${cardW}px, reduzido a ${card1.w}px (${card1.k.toFixed(2)}×)`,
        },
      ],
    },
    {
      titulo: 'Referência — card “Recompensas reais” da prancha 6 × cards 1 e 3, 1:1',
      nota: 'linguagem de card: fotografia, título, microcopy — nenhum dado de conta',
      itens: [
        {
          buf: ref.card.buf,
          w: ref.card.width,
          h: ref.card.height,
          legenda: `prancha “6.” card “Recompensas reais” — 1:1 (${ref.card.width}×${ref.card.height})`,
        },
        {
          buf: await recorteCard(0),
          w: cardW,
          h: imgH,
          legenda: `card “Produtos NUY” — 1:1 (${cardW}×${imgH})`,
        },
        {
          buf: await recorteCard(2),
          w: cardW,
          h: imgH,
          legenda: `card “Experiências especiais” — 1:1 (${cardW}×${imgH})`,
        },
      ],
    },
    {
      titulo: 'Implementação — seção 07 · 1920 CSS px, escala 1:1',
      nota: `três cards de ${cardW}px · seção de ${p1920.rewards.h}px · página de ${impl.height}px`,
      itens: [
        {
          buf: secFile,
          w: secM.width ?? 0,
          h: secM.height ?? 0,
          legenda:
            'seção 07 completa em 1920 — título à esquerda, fileira de três cards fechando na régua direita',
        },
      ],
    },
  ]);
}
