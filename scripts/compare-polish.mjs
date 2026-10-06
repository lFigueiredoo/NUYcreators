import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const root = 'artifacts/visual-polish';
await mkdir(`${root}/comparisons`, { recursive: true });
const sections = {
  hero: 'Hero / header',
  projeto: 'O projeto',
  jornada: 'Jornada',
  transition: 'Transição jornada / experiências',
  experiencias: 'Experiências',
  cta: 'CTA final',
};
for (const [key] of Object.entries(sections)) {
  for (const width of [1920, 390]) {
    const before = await sharp(`${root}/before/${key}-${width}.png`).metadata();
    const after = await sharp(`${root}/after/${key}-${width}.png`).metadata();
    const height = Math.max(before.height, after.height);
    await sharp({
      create: { width: width * 2, height: height + 48, channels: 4, background: '#10182c' },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${width * 2}" height="48"><g fill="#f8f0e6" font-family="sans-serif" font-size="20"><text x="20" y="31">ANTES</text><text x="${width + 20}" y="31">DEPOIS</text></g></svg>`,
          ),
          top: 0,
          left: 0,
        },
        { input: `${root}/before/${key}-${width}.png`, top: 48, left: 0 },
        { input: `${root}/after/${key}-${width}.png`, top: 48, left: width },
      ])
      .png()
      .toFile(`${root}/comparisons/${key}-${width}.png`);
  }
}
await writeFile(
  `${root}/index.html`,
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NUY — Polimento visual</title><style>body{margin:0;padding:40px;background:#091226;color:#f8f0e6;font:16px/1.6 system-ui}main{max-width:1500px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:44px}h2{margin-top:56px}a{color:#d3bce9}img{width:100%;height:auto;display:block;margin:16px 0}p{max-width:80ch}summary{cursor:pointer}small{color:#b7b1c8}</style><main><h1>NUY Creators · polimento visual</h1><p>Comparações da mesma página e das mesmas larguras. À esquerda: antes; à direita: depois. Os PNGs preservam os pixels das capturas, sem ampliação.</p><small>Baseline capturada no servidor de desenvolvimento; o indicador do Next.js nas imagens “antes” não é parte da landing. Capturas finais feitas em produção. As seis imagens mencionadas no pedido não estavam anexadas à sessão.</small>${Object.entries(
    sections,
  )
    .map(
      ([key, label]) =>
        `<section><h2>${label}</h2><a href="comparisons/${key}-1920.png">Abrir comparação desktop em resolução integral</a><img src="comparisons/${key}-1920.png" alt="Antes e depois: ${label}"><p><a href="after/${key}-1920.png">Screenshot final desktop</a> · <a href="after/${key}-390.png">Screenshot final mobile</a></p><details><summary>Comparação mobile</summary><img style="max-width:780px" src="comparisons/${key}-390.png" alt="Antes e depois mobile: ${label}"></details></section>`,
    )
    .join(
      '',
    )}<h2>Limites de origem</h2><p>O retrato ainda tem suavidade da arte original. Os rótulos dos produtos e os florais também têm limite de detalhe, sobretudo em telas DPR 2/3. Não houve upscale ou nitidez artificial na geração dos novos assets.</p></main></html>`,
);
console.log(`${root}/index.html`);
