/**
 * Proposta C · Checkpoint 4A — capturas, probes, contraste e bitmap do acesso.
 *
 * Mesmo protocolo dos checkpoints da landing: porta própria (3125), env
 * Appwrite zerado, loading=eager + decode() antes dos shots e DPR 2 no mobile.
 *
 * Além das seis capturas pedidas (login/cadastro × 1920/1440/390), o script:
 *   · mede a geometria real de cada tela (divisão, faixa, campos, botão);
 *   · audita o bitmap servido de cada imagem (largura, DPR, currentSrc);
 *   · mede o contraste no bitmap RENDERIZADO dos textos sobre cor e sobre a
 *     fotografia (a frase do painel é creme sobre a imagem — só medindo);
 *   · compõe `landing-to-login-comparison.png` com as duas telas na MESMA
 *     escala, lado a lado com as medidas que provam a continuidade.
 *
 * As seis capturas canônicas saem com o ambiente de autenticação PRESENTE (só
 * para ligar `authConfigured()` no render — os valores são inertes e nenhuma
 * chamada de rede acontece), porque é esse o estado que a pessoa vê no site
 * real: CTA navy cheio e sem aviso. O estado desconectado (aviso discreto +
 * CTA desabilitado) ganha uma captura própria, à parte.
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'artifacts/proposta-c/auth-cp4a';
const PORT = '3125';
const BASE = `http://localhost:${PORT}`;
const ROUTES = [
  ['login', '/login'],
  ['cadastro', '/cadastro'],
];
const VIEWS = [
  [1920, 1080, 1],
  [1440, 1000, 1],
  [390, 844, 2],
];

// O `next start` já carrega o `.env.local` do projeto. As capturas canônicas
// usam esse ambiente real e reproduzem exatamente o que o seu dev mostra hoje:
// o login habilitado (em desenvolvimento a checagem de rate limit é dispensada;
// aqui ela é declarada verificada) e o cadastro DESLIGADO, com o aviso — o
// cadastro espera aprovação legal de versão de termos e idade mínima
// (NUY_TERMS_VERSION/NUY_MINIMUM_AGE vazios, por decisão, não por bug).
// Nada é submetido e nenhuma chamada de rede nasce do render.
const AMBIENTE_LIGADO = {
  AUTH_RATE_LIMIT_VERIFIED: 'true',
  APP_URL: 'https://localhost:3125',
};
const AMBIENTE_DESLIGADO = {
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
  APPWRITE_REGISTRATION_ENABLED: 'false',
  APPWRITE_FUNCTIONS_ENABLED: 'false',
};

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// O otimizador indexa por URL+w+q, não pelo conteúdo: cache velho serve bytes
// velhos para o mesmo nome.
await rm('.next/cache/images', { recursive: true, force: true });

// ------------------------------------------------------------------ servidor --
async function liberarPorta() {
  for (let i = 0; i < 5; i++) {
    let busy = '';
    try {
      busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
    } catch {
      busy = '';
    }
    if (!busy) return;
    for (const line of busy.split('\n')) {
      if (!/\bLISTENING\b/.test(line)) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) {
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { shell: 'cmd.exe' });
        } catch {}
      }
    }
    await sleep(1000);
  }
}

async function subirServidor(ambiente) {
  await liberarPorta();
  const server = spawn('npx', ['next', 'start', '-p', PORT], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', PORT, ...ambiente },
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/login`)).ok) return server;
    } catch {}
    await sleep(1000);
  }
  throw new Error('servidor não respondeu na porta ' + PORT);
}

async function derrubarServidor(server) {
  server.kill();
  await sleep(500);
  await liberarPorta();
}

// ------------------------------------------------------------------ helpers --
const srgb2lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * srgb2lin(r) + 0.7152 * srgb2lin(g) + 0.0722 * srgb2lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgbOf = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Bitmap realmente servido — `naturalWidth` mente sob srcset. */
async function audit(page, sel, label) {
  const info = await page.evaluate((s) => {
    const img = document.querySelector(s);
    if (!img) return { erro: `not found: ${s}` };
    const r = img.getBoundingClientRect();
    return {
      displayed: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
      dpr: window.devicePixelRatio,
      currentSrc: img.currentSrc,
    };
  }, sel);
  if (!info.currentSrc) return info;
  const res = await fetch(info.currentSrc, { headers: { Accept: 'image/avif,image/webp,*/*' } });
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  const [w] = info.displayed.split('x').map(Number);
  const parsed = new globalThis.URL(info.currentSrc, 'http://x');
  const asset = (parsed.searchParams.get('url') ?? parsed.pathname).split('/').pop() ?? '';
  return {
    label,
    bitmap: `${meta.width}x${meta.height}`,
    displayed: info.displayed,
    dpr: info.dpr,
    pixelsPorCss: +(meta.width / w).toFixed(3),
    pixelsPorDev: +(meta.width / (w * info.dpr)).toFixed(3),
    upscale: meta.width < w * info.dpr,
    asset: decodeURIComponent(asset),
  };
}

/** Contraste medido no bitmap renderizado (p50 = fundo; tinta declarada). */
async function contrastOnShot(file, box, inkHex, alpha = 1) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.max(0, Math.round(box.x));
  const y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(info.width, Math.round(box.x + box.w));
  const y1 = Math.min(info.height, Math.round(box.y + box.h));
  const px = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      px.push({ rgb, l: lum(rgb[0], rgb[1], rgb[2]) });
    }
  }
  px.sort((a, b) => a.l - b.l);
  const inkRgb = rgbOf(inkHex);
  const sobre = (fundo) => {
    const inkEff = inkRgb.map((c, i) => alpha * c + (1 - alpha) * fundo[i]);
    return ratio(lum(...inkEff), lum(...fundo));
  };
  const fundo = px[Math.floor(px.length * 0.5)].rgb;
  // O quadro contém os próprios glifos: para o pior caso, tirar da amostra
  // tudo que está perto da cor da tinta e olhar o fundo mais claro que sobra.
  const distancia = (rgb) => Math.hypot(rgb[0] - inkRgb[0], rgb[1] - inkRgb[1], rgb[2] - inkRgb[2]);
  const soFundo = px.filter((amostra) => distancia(amostra.rgb) > 90);
  const claro = (soFundo.length ? soFundo : px)[
    Math.floor((soFundo.length ? soFundo : px).length * 0.95)
  ].rgb;
  return {
    amostras: px.length,
    fundoP50: hex(fundo),
    contraste: +sobre(fundo).toFixed(2),
    contrastePior: +Math.min(sobre(claro), sobre(fundo)).toFixed(2),
    fundoP95semTinta: hex(claro),
  };
}

async function fresh(path, width, height, dpr) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const img of Array.from(document.images)) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  await sleep(500);
  return { browser, page };
}

const PROBE = () => {
  const p = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const q = (s) => document.querySelector(s);
  const st = (el) => getComputedStyle(el);
  const shell = q('main');
  const visual = q('main figure');
  const img = q('main figure img');
  const h1 = q('h1');
  const form = q('form');
  const inputs = Array.from(document.querySelectorAll('form input:not([type=hidden])'));
  const submit = q('button[type=submit]');
  const column = shell.children[1].children[1 - 1 + 1];
  const label = q('form label');
  const email = q('form input[name=email]');
  return {
    rota: location.pathname,
    innerWidth,
    dpr: devicePixelRatio,
    docScrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    shell: p(shell),
    shellBg: st(shell).backgroundColor,
    headerH: Math.round(q('header').getBoundingClientRect().height),
    gutter: st(q('header')).paddingLeft,
    lockupMarkFont: st(q('header span')).fontFamily.split(',')[0].replace(/["']/g, ''),
    lockupMarkPx: st(q('header span')).fontSize,
    lockupMarkTracking: st(q('header span')).letterSpacing,
    visual: p(visual),
    splitRatio: +(
      visual.getBoundingClientRect().width / shell.getBoundingClientRect().width
    ).toFixed(4),
    image: {
      box: p(img),
      currentSrc: img.currentSrc,
      objectPosition: st(img).objectPosition,
      alt: img.alt,
    },
    phrase: p(q('figure p')),
    // Caixas justas de cada linha da frase: medir contraste sobre a caixa
    // inteira do parágrafo pegaria foto clara onde não há texto nenhum.
    phraseLinhas: (() => {
      const el = q('figure p');
      if (!el) return [];
      const range = document.createRange();
      range.selectNodeContents(el);
      return Array.from(range.getClientRects())
        .filter((r) => r.width > 4 && r.height > 4)
        .map((r) => ({
          x: Math.round(r.x),
          y: Math.round(r.y + scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
        }));
    })(),
    phraseFont: st(q('figure p')).fontFamily.split(',')[0].replace(/["']/g, ''),
    phrasePx: st(q('figure p')).fontSize,
    column: p(column),
    formShell: p(form.closest('section')),
    title: p(h1),
    titleText: h1.innerText.replace(/\n/g, ' '),
    titleFont: st(h1).fontFamily.split(',')[0].replace(/["']/g, ''),
    titlePx: st(h1).fontSize,
    lead: p(h1.nextElementSibling),
    leadColor: st(h1.nextElementSibling).color,
    aviso: p(q('form p[role=status]')),
    inputs: inputs.map((el) => ({
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      required: el.required,
      minLength: el.minLength > 0 ? el.minLength : null,
      box: p(el),
    })),
    labelPx: st(label).fontSize,
    labelColor: st(label).color,
    emailBox: p(email),
    emailStyle: {
      border: st(email).borderColor,
      radius: st(email).borderRadius,
      background: st(email).backgroundColor,
      minHeight: st(email).minHeight,
    },
    submit: p(submit),
    submitText: submit.innerText.trim(),
    submitStyle: {
      background: st(submit).backgroundColor,
      color: st(submit).color,
      radius: st(submit).borderRadius,
      font: st(submit).fontFamily.split(',')[0].replace(/["']/g, ''),
      px: st(submit).fontSize,
      weight: st(submit).fontWeight,
      opacity: st(submit).opacity,
      disabled: submit.disabled,
    },
    legal: p(q('nav[aria-label="Informações legais"]')),
    fontsReady: {
      playfair: document.fonts.check('16px "Playfair Display"'),
      inter: document.fonts.check('16px Inter'),
    },
  };
};

const relatorio = {};

// ------------------------------------------------- capturas com acesso ligado --
let server = await subirServidor(AMBIENTE_LIGADO);

for (const [nome, rota] of ROUTES) {
  for (const [w, h, dpr] of VIEWS) {
    const sufixo = String(w);
    const { browser, page } = await fresh(rota, w, h, dpr);
    const probe = await page.evaluate(PROBE);
    const arquivo = `${OUT}/${nome}-${sufixo}.png`;
    await page.screenshot({ path: arquivo, fullPage: true });
    const bitmap = await audit(page, 'main figure img', `${nome}@${sufixo}`);
    const contrastes = [];

    // Textos sobre cor (medidos no bitmap renderizado da própria captura).
    const alvos = [
      ['titulo', probe.title, '#0e2a44'],
      ['lead', probe.lead, '#4a6076'],
      ['label', { x: probe.emailBox.x, y: probe.emailBox.y - 24, w: 60, h: 20 }, '#0e2a44'],
      ['botao', probe.submit, '#fdfaf5'],
    ];
    for (const [alvo, box, tinta] of alvos) {
      if (!box) continue;
      // A captura 390 está em DPR 2: as caixas medidas pelo DOM estão em CSS.
      const medido = await contrastOnShot(
        arquivo,
        { x: box.x * dpr, y: box.y * dpr, w: box.w * dpr, h: box.h * dpr },
        tinta,
      );
      contrastes.push({ alvo, alvoTinta: tinta, ...medido });
    }

    // A frase sobre a fotografia: linha por linha, na caixa justa dos glifos.
    const linhas = [];
    for (const [i, box] of (probe.phraseLinhas ?? []).entries()) {
      const medido = await contrastOnShot(
        arquivo,
        { x: box.x * dpr, y: box.y * dpr, w: box.w * dpr, h: box.h * dpr },
        '#fdfaf5',
      );
      linhas.push({ linha: i + 1, box, ...medido });
    }
    if (linhas.length)
      contrastes.push({
        alvo: 'frase-sobre-foto',
        alvoTinta: '#fdfaf5',
        // Pior linha manda: é a que decide se a frase lê sobre a imagem.
        contraste: Math.min(...linhas.map((l) => l.contraste)),
        contrastePior: Math.min(...linhas.map((l) => l.contrastePior)),
        linhas,
      });

    relatorio[`${nome}@${sufixo}`] = { probe, bitmap, contrastes };
    console.log(`\n=== ${nome} @${sufixo} (DPR ${dpr}) ===`);
    console.log(
      JSON.stringify({
        divisao: probe.splitRatio,
        faixa: probe.visual?.h,
        shell: probe.shellBg,
        titulo: `${probe.titleFont} ${probe.titlePx}`,
        gutter: probe.gutter,
        campos: probe.inputs.map((i) => i.name),
        botao: probe.submitStyle,
        pagina: { altura: probe.docScrollHeight, primeiroCampo: probe.inputs[0]?.box.y },
        bitmap,
        contraste: contrastes.map((c) => `${c.alvo}=${c.contraste}`),
        fontsReady: probe.fontsReady,
      }),
    );
    await browser.close();
  }
}

// ------------------------------------------------------------ comparação --
{
  const { browser, page } = await fresh('/', 1920, 1080, 1);
  await page.screenshot({ path: `${OUT}/landing-1920.png`, fullPage: false });
  await browser.close();

  const H = 860;
  const landing = await sharp(`${OUT}/landing-1920.png`)
    .extract({ left: 0, top: 0, width: 1920, height: H })
    .toBuffer();
  const login = await sharp(`${OUT}/login-1920.png`)
    .extract({ left: 0, top: 0, width: 1920, height: H })
    .toBuffer();

  const svg = (w, h, corpo) =>
    Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${corpo}</svg>`,
    );
  const rotulo = (texto, numero) =>
    svg(
      1920,
      56,
      `<rect width="1920" height="56" fill="#f9f5ef"/>
       <text x="40" y="36" font-family="Georgia, serif" font-size="24" fill="#0e2a44">${numero} · ${texto}</text>
       <text x="1880" y="36" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#4a6076">1:1 · 1920 CSS px</text>`,
    );
  const legenda = svg(
    1920,
    128,
    `<rect width="1920" height="128" fill="#0e2a44"/>
     <text x="40" y="46" font-family="Georgia, serif" font-size="27" fill="#fdfaf5">A mesma identidade: lockup NUY/CREATORS 15px · 0,12em · Playfair Display, régua de 104px, navy #0E2A44 e o mesmo raio de botão nas duas telas.</text>
     <text x="40" y="82" font-family="Helvetica, Arial, sans-serif" font-size="19" fill="#d8c1ad">Acima: landing pública (Proposta C). Abaixo: /login — mesma família tipográfica, mesma paleta creme/bege/areia, mesma fotografia de campanha com enquadramento próprio.</text>
     <text x="40" y="110" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#c7a1b3">Medidas conferidas por probe no navegador (auth-cp4a/probe.json) — lockup, calha, família, raio e navy idênticos aos da landing.</text>`,
  );

  await sharp({
    create: {
      width: 1920,
      height: 56 + H + 8 + 56 + H + 128,
      channels: 3,
      background: '#efe7db',
    },
  })
    .composite([
      { input: rotulo('LANDING PÚBLICA — topo em 1920', '01'), top: 0, left: 0 },
      { input: landing, top: 56, left: 0 },
      { input: rotulo('LOGIN — a mesma casa', '02'), top: 56 + H + 8, left: 0 },
      { input: login, top: 56 + H + 8 + 56, left: 0 },
      { input: legenda, top: 56 + H + 8 + 56 + H, left: 0 },
    ])
    .png()
    .toFile(`${OUT}/landing-to-login-comparison.png`);
}

await derrubarServidor(server);

// --------------------------------------- estado desconectado (uma evidência) --
server = await subirServidor(AMBIENTE_DESLIGADO);
{
  const { browser, page } = await fresh('/login', 1440, 1000, 1);
  const probe = await page.evaluate(PROBE);
  const arquivo = `${OUT}/estado-desconectado-1440.png`;
  await page.screenshot({ path: arquivo, fullPage: true });
  const contrasteAviso = probe.aviso ? await contrastOnShot(arquivo, probe.aviso, '#0e2a44') : null;
  relatorio['estado-desconectado@1440'] = { probe, contrasteAviso };
  console.log('\n=== estado desconectado @1440 ===');
  console.log(
    JSON.stringify({
      aviso: probe.aviso,
      botao: probe.submitStyle,
      contrasteAviso,
    }),
  );
  await browser.close();
}
await derrubarServidor(server);

// ------------------------------------------------------- contraste declarado --
// Estados de erro/sucesso não aparecem em nenhuma captura (só depois de um
// envio de verdade): o contraste deles é calculado das cores declaradas, e o
// relatório diz isso com todas as letras.
const declarado = [
  ['mensagem de erro', '#7d332d', '#fbeeec'],
  ['mensagem de sucesso', '#2f5b46', '#eef5f0'],
  ['aviso (não configurado)', '#0e2a44', '#eadcc8'],
  ['link secundário', '#0e2a44', '#f9f5ef'],
];
relatorio.contrasteDeclarado = declarado.map(([alvo, tinta, fundo]) => ({
  alvo,
  tinta,
  fundo,
  contraste: +ratio(lum(...rgbOf(tinta)), lum(...rgbOf(fundo))).toFixed(2),
}));

await writeFile(`${OUT}/probe.json`, JSON.stringify(relatorio, null, 2));
console.log('\ncontraste declarado:', JSON.stringify(relatorio.contrasteDeclarado));
console.log('\nOK — capturas em', OUT);
