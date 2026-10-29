/**
 * Rodada legal — capturas e probes de `/termos`, `/privacidade` e do aceite.
 *
 * Mesmo protocolo das rodadas anteriores: porta própria (3126), env Appwrite
 * zerado (o documento é público e não depende de sessão), `loading=eager` +
 * `decode()` antes dos shots e DPR 2 no mobile.
 *
 * O que este script prova, além das capturas:
 *   · o documento CABE na largura em que é lido (sem rolagem horizontal);
 *   · a coluna tem medida de leitura (largura × tamanho de fonte medidos no
 *     DOM, com a largura média de caractere medida em canvas — não estimada);
 *   · o aviso de versão provisória está no TOPO dos termos e no FECHO da
 *     política, e o contraste dele é medido no par de cores COMPOSTO (o
 *     `rgba()` do texto sobre o creme da página, não sobre branco);
 *   · o aceite do cadastro traz os dois links legais reais e clicar num deles
 *     navega SEM marcar a caixa (o `<label>` não pode capturar o clique).
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'artifacts/sprint9-legal';
const PORT = '3126';
const BASE = `http://localhost:${PORT}`;
const ROUTES = [
  ['termos', '/termos'],
  ['privacidade', '/privacidade'],
];
const VIEWS = [
  [1920, 1080, 1],
  [1440, 1000, 1],
  [390, 844, 2],
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// --------------------------------------------------------------- servidor --
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

async function subirServidor() {
  await liberarPorta();
  const server = spawn('npx', ['next', 'start', '-p', PORT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT,
      APPWRITE_ENDPOINT: '',
      APPWRITE_PROJECT_ID: '',
      APPWRITE_AUTH_API_KEY: '',
      APPWRITE_API_KEY: '',
      APPWRITE_OPS_API_KEY: '',
      APPWRITE_REGISTRATION_ENABLED: 'false',
      APPWRITE_FUNCTIONS_ENABLED: 'false',
    },
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/termos`)).ok) return server;
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

// ---------------------------------------------------------------- contraste --
const srgb2lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * srgb2lin(r) + 0.7152 * srgb2lin(g) + 0.0722 * srgb2lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const parse = (css) => {
  const n = css.match(/[\d.]+/g)?.map(Number) ?? [];
  return { rgb: n.slice(0, 3), alpha: n.length > 3 ? n[3] : 1 };
};
/** Texto `rgba()` sobre um fundo sólido: compõe ANTES de medir. */
const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.alpha + bg.rgb[i] * (1 - fg.alpha));

/** Prova de legibilidade: cor computada do texto, fundo efetivo e a razão. */
async function contraste(page, selector) {
  const found = await page.evaluate(
    ([sel, bgSel]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const bgEl = document.querySelector(bgSel);
      return {
        texto: cs.color,
        fundo: bgEl ? getComputedStyle(bgEl).backgroundColor : 'rgb(255, 255, 255)',
        tamanho: cs.fontSize,
        peso: cs.fontWeight,
      };
    },
    [selector, 'main'],
  );
  if (!found) return null;
  const fg = parse(found.texto);
  const bg = parse(found.fundo);
  return {
    cor: found.texto,
    fundo: found.fundo,
    tamanho: found.tamanho,
    peso: found.peso,
    razao: +ratio(lum(over(fg, bg)), lum(bg.rgb)).toFixed(2),
  };
}

// -------------------------------------------------------------------- main --
const server = await subirServidor();
const browser = await chromium.launch();
const probes = { rotas: {}, aceite: {} };

try {
  for (const [w, h, dpr] of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: dpr,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const [nome, rota] of ROUTES) {
      await page.goto(BASE + rota, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // Lazy não pinta: nada abaixo da dobra apareceria no fullPage.
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('img')).forEach((img) => {
          img.loading = 'eager';
          img.decode?.().catch(() => {});
        }),
      );
      await sleep(250);

      const geo = await page.evaluate(() => {
        const doc = document.querySelector('article');
        const body = doc?.querySelector('div:last-child');
        // O estilo que vale é o do PARÁGRAFO, não o do contêiner: uma regra
        // global de `p` pode vencer a herança, e aí o contêiner declara um
        // tamanho que o texto não tem. Medir o contêiner foi o erro da rodada
        // anterior (dizia 1.075rem com o texto em 0.95rem).
        const amostra = body?.querySelector('p');
        const cs = amostra ? getComputedStyle(amostra) : body ? getComputedStyle(body) : null;
        // Largura média de caractere MEDIDA na fonte renderizada, não estimada.
        let cpl = null;
        if (cs && body) {
          const canvas = document.createElement('canvas').getContext('2d');
          canvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const textoAmostra = 'abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcd';
          const larguraMedia = canvas.measureText(textoAmostra).width / textoAmostra.length;
          cpl = Math.round(body.getBoundingClientRect().width / larguraMedia);
        }
        // A medida REAL: somando os caracteres de todos os parágrafos e
        // dividindo pelo número de LINHAS renderizadas sai a média honesta da
        // coluna. Duas armadilhas já custaram uma medição errada:
        //   · contar só a primeira linha — o número varia com o lugar em que a
        //     última palavra caberia, não com a largura da coluna;
        //   · contar RETÂNGULOS — um `<strong>` no meio do parágrafo parte a
        //     linha em vários retângulos e a média desaba (os termos, que têm
        //     `<strong>`, mediam 48 caracteres contra 69 da política, de mesma
        //     coluna). Linha se conta por `top` distinto, não por retângulo.
        let cplReal = null;
        let linhasContadas = 0;
        let caracteresContados = 0;
        for (const paragrafo of body?.querySelectorAll('p') ?? []) {
          const r = document.createRange();
          r.selectNodeContents(paragrafo);
          const topos = new Set(
            Array.from(r.getClientRects())
              .filter((rect) => rect.width > 0)
              .map((rect) => Math.round(rect.top)),
          );
          if (!topos.size) continue;
          linhasContadas += topos.size;
          caracteresContados += paragrafo.textContent.replace(/\s+/g, ' ').trim().length;
        }
        if (linhasContadas) cplReal = +(caracteresContados / linhasContadas).toFixed(1);
        // `1ch` MEDIDO (largura do zero na fonte do corpo), para a coluna poder
        // ser declarada também na unidade que os guias de tipografia usam —
        // lembrando que `ch` é o ZERO, não o caractere médio: a coluna de 623px
        // dá ~70 caracteres reais e ~61ch, e as duas contas estão certas.
        let larguraEmCh = null;
        if (cs && body) {
          const sonda = document.createElement('span');
          sonda.textContent = '0';
          sonda.style.cssText = `position:absolute;visibility:hidden;font-size:${cs.fontSize};font-family:${cs.fontFamily};font-weight:${cs.fontWeight}`;
          document.body.appendChild(sonda);
          const chPx = sonda.getBoundingClientRect().width;
          sonda.remove();
          if (chPx) larguraEmCh = +(body.getBoundingClientRect().width / chPx).toFixed(1);
        }
        return {
          rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          coluna: doc ? +doc.getBoundingClientRect().width.toFixed(1) : null,
          sobraLateral: doc
            ? +((window.innerWidth - doc.getBoundingClientRect().width) / 2).toFixed(1)
            : null,
          corpoFonte: cs?.fontSize ?? null,
          corpoAlturaLinha: cs?.lineHeight ?? null,
          caracteresPorLinha: cpl,
          caracteresLinhaReal: cplReal,
          linhasMedidas: linhasContadas,
          colunaEmCh: larguraEmCh,
          colunaCorpo: body ? +body.getBoundingClientRect().width.toFixed(1) : null,
          titulo: document.querySelector('h1')?.textContent ?? null,
          sobretitulo: document.querySelector('article p')?.textContent ?? null,
          secoes: Array.from(document.querySelectorAll('article h2')).map((el) => el.textContent),
          // O aviso do topo é ESTRUTURAL, não uma coincidência de texto: os
          // termos trazem três parágrafos no cabeçalho (sobretítulo, versão,
          // aviso) e a política traz dois (sobretítulo, versão). O `startsWith`
          // no último parágrafo impede que o "Versão provisória" do subtítulo
          // da política passe por aviso.
          headerParagrafos: document.querySelectorAll('article header p').length,
          avisoNoTopo: (() => {
            const ps = document.querySelectorAll('article header p');
            const ultimo = ps[ps.length - 1]?.textContent ?? '';
            return (
              ps.length >= 3 &&
              (ultimo.startsWith('Versão provisória') || ultimo.startsWith('Minuta revisada'))
            );
          })(),
          avisoNoFecho: (
            Array.from(document.querySelectorAll('article div:last-child p')).pop()?.textContent ??
            ''
          ).includes('provisória'),
          headerPresente: Boolean(document.querySelector('header')),
          footerPresente: Boolean(document.querySelector('footer')),
        };
      });

      probes.rotas[`${nome}@${w}`] = {
        ...geo,
        // O nome da classe é hasheado pelo CSS Module: o casamento é por
        // substring, que é o que o DOM realmente publica.
        avisoTopo: geo.avisoNoTopo ? await contraste(page, 'article [class*=notice]') : null,
        subtitulo: await contraste(page, 'article [class*=subtitle]'),
        tituloContraste: await contraste(page, 'article h1'),
        corpoContraste: await contraste(page, 'article div:last-child > p'),
        errosJS: errors,
      };

      await page.screenshot({ path: `${OUT}/${nome}-${w}.png`, fullPage: true });

      // O aviso e o cabeçalho, ampliados: texto pequeno não se julga em
      // miniatura. O segundo alvo segue o que a página REALMENTE tem — nos
      // termos é o aviso de provisoriedade; na política, que fecha o corpo com
      // o mesmo aviso, é a linha de versão. Rotular o subtítulo de "aviso"
      // seria evidência mentirosa.
      const alvos = [
        ['topo', 'article header'],
        geo.avisoNoTopo
          ? ['aviso', 'article [class*=notice]']
          : ['versao', 'article [class*=subtitle]'],
      ];
      for (const [sufixo, sel] of alvos) {
        const alvo = page.locator(sel).first();
        if (await alvo.count()) {
          const buf = await alvo.screenshot();
          const meta = await sharp(buf).metadata();
          // A largura entra no nome: sem ela o zoom do último viewport
          // sobrescreveria o do primeiro e a evidência perderia a procedência.
          await sharp(buf)
            .resize({ width: Math.min(meta.width * 2, 2400), kernel: 'lanczos3' })
            .toFile(`${OUT}/zoom-${nome}-${sufixo}-${w}.png`);
        }
      }
    }

    await context.close();
  }

  // ----------------------------------------------------------------- links --
  // Todo destino que as duas páginas oferecem (chrome + miolo) responde. O que
  // este probe NÃO prova é a existência da âncora (`/#faq`): o fragmento nunca
  // chega ao servidor. Âncora é assunto do gate de fronteira, não daqui.
  const contextLinks = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const pageLinks = await contextLinks.newPage();
  probes.links = {};
  for (const [nome, rota] of ROUTES) {
    await pageLinks.goto(BASE + rota);
    const hrefs = await pageLinks
      .locator('header a[href], main a[href], footer a[href]')
      .evaluateAll((els) =>
        Array.from(new Set(els.map((el) => new URL(el.href, location.href).href))).sort(),
      );
    const destinos = {};
    for (const href of hrefs) {
      try {
        const resposta = await fetch(href, { redirect: 'manual' });
        destinos[href] = resposta.status;
      } catch (erro) {
        destinos[href] = `ERRO ${erro.message}`;
      }
    }
    probes.links[nome] = destinos;
  }
  await contextLinks.close();

  // --------------------------------------------------------------- aceite --
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errosAceite = [];
  page.on('pageerror', (e) => errosAceite.push(e.message));

  for (const rota of ['/cadastro', '/onboarding']) {
    await page.goto(BASE + rota);
    await page.evaluate(() => document.fonts.ready);
    const label = page.locator('label:has(input[name="terms"]) span').first();
    if (!(await label.count())) {
      probes.aceite[rota] = { encontrado: false };
      continue;
    }
    const links = await label
      .locator('a')
      .evaluateAll((els) =>
        els.map((el) => ({ texto: el.textContent, href: el.getAttribute('href') })),
      );
    // Lido ANTES do clique: depois da navegação o `<label>` já não existe.
    const texto = (await label.textContent()).trim();
    const antes = await page.locator('input[name="terms"]').isChecked();
    await label.locator('a[href="/termos"]').click();
    await page.waitForURL('**/termos');
    const caixa = page.locator('input[name="terms"]').first();
    probes.aceite[rota] = {
      encontrado: true,
      texto,
      links,
      caixaAntesDoClique: antes,
      // O clique no link navega e não deixa caixa marcada: `<a>` é conteúdo
      // interativo, então o `<label>` não dispara a ativação do controle. Na
      // rota de destino a caixa nem existe — daí a leitura condicional.
      caixaNoDestino: (await caixa.count()) ? await caixa.isChecked() : null,
      urlAposClique: page.url(),
    };
  }

  await page.goto(BASE + '/cadastro');
  await page.evaluate(() => document.fonts.ready);
  const caixa = page.locator('input[name="terms"]');
  await caixa.check();
  probes.aceite.cliqueNaCaixa = {
    caixaAntesDoClique: false,
    caixaDepoisDoClique: await caixa.isChecked(),
    urlPermaneceu: page.url(),
  };
  probes.aceite.errosJS = errosAceite;

  await page.screenshot({ path: `${OUT}/cadastro-aceite-1920.png`, fullPage: true });
  const aceite = page.locator('label:has(input[name="terms"])').first();
  const buf = await aceite.screenshot();
  const meta = await sharp(buf).metadata();
  await sharp(buf)
    .resize({ width: Math.min(meta.width * 2, 2400), kernel: 'lanczos3' })
    .toFile(`${OUT}/zoom-cadastro-aceite.png`);

  await context.close();
} finally {
  await browser.close();
  await derrubarServidor(server);
}

await writeFile(`${OUT}/probes.json`, JSON.stringify(probes, null, 2));

// Resumo legível — o que foi medido, em uma linha por item.
const linhas = [];
for (const [chave, p] of Object.entries(probes.rotas)) {
  linhas.push(
    `${chave.padEnd(18)} moldura ${String(p.coluna).padStart(6)}px · corpo ${String(p.colunaCorpo).padStart(6)}px (${p.colunaEmCh}ch) · texto ${p.corpoFonte}/${p.corpoAlturaLinha} · ` +
      `${p.caracteresLinhaReal} car/linha (média de ${p.linhasMedidas} linhas) · rolagem-h ${p.rolagemHorizontal ? 'SIM' : 'não'} · ` +
      `secoes ${p.secoes.length} · aviso-topo ${p.avisoNoTopo ? 'sim' : 'não'} · aviso-fecho ${p.avisoNoFecho ? 'sim' : 'não'} · ` +
      `contraste aviso ${p.avisoTopo?.razao ?? 'n/a'}:1 · subtitulo ${p.subtitulo?.razao}:1 · titulo ${p.tituloContraste?.razao}:1 · ` +
      `corpo ${p.corpoContraste?.razao}:1 · chrome ${p.headerPresente && p.footerPresente ? 'ok' : 'FALTA'} · erros ${p.errosJS.length}`,
  );
}
for (const [nome, destinos] of Object.entries(probes.links ?? {})) {
  const entradas = Object.entries(destinos);
  const ruins = entradas.filter(([, s]) => typeof s !== 'number' || s >= 400);
  linhas.push(
    `${nome.padEnd(18)} links ${entradas.length} destinos · ` +
      `${ruins.length === 0 ? 'todos respondem' : 'FALHA em ' + ruins.map(([h, s]) => `${h} → ${s}`).join(', ')}`,
  );
}
for (const [rota, a] of Object.entries(probes.aceite)) {
  if (rota === 'errosJS') continue;
  if (a.encontrado === false) {
    linhas.push(`${rota.padEnd(18)} aceite nao encontrado`);
    continue;
  }
  if (a.links) {
    linhas.push(
      `${rota.padEnd(18)} aceite: ${a.links.map((l) => `${l.texto}→${l.href}`).join(' + ')} · ` +
        `navegou ${a.urlAposClique} · caixa ${a.caixaAntesDoClique}→${a.caixaNoDestino ?? 'n/a'}`,
    );
  } else {
    linhas.push(
      `${rota.padEnd(18)} caixa ${a.caixaAntesDoClique}→${a.caixaDepoisDoClique} · url ${a.urlPermaneceu}`,
    );
  }
}
const resumo = linhas.join('\n');
await writeFile(`${OUT}/resumo.txt`, resumo + '\n');
console.log(resumo);
console.log('\nerros JS no aceite:', probes.aceite.errosJS?.length ?? 0);
