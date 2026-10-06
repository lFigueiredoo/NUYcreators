/**
 * Guarda de regressão do globals.css.
 *
 * Antes e depois de limpar o CSS órfão da landing, fotografa as rotas que
 * COMPARTILHAM o globals.css — `(public)`, auth e protegido — para provar por
 * diff de pixel que a limpeza não encostou nelas.
 *
 * uso: node scripts/pc-css-guard.mjs <dir-de-saida>
 */
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2];
if (!OUT) throw new Error('faltou o diretório de saída');
const PORT = '3125';
const BASE = `http://localhost:${PORT}`;

const ROTAS = [
  ['home', '/'],
  ['login', '/login'],
  ['cadastro', '/cadastro'],
  ['recuperar-senha', '/recuperar-senha'],
  ['privacidade', '/privacidade'],
  ['termos', '/termos'],
  ['desafios', '/desafios'],
  ['recompensas', '/recompensas'],
  ['ranking', '/ranking'],
  ['app', '/app'],
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (let i = 0; i < 5; i++) {
  let busy = '';
  try {
    busy = execSync(`netstat -ano | findstr :${PORT}`, { shell: 'cmd.exe' }).toString().trim();
  } catch {
    busy = '';
  }
  if (!busy) break;
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

const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT,
  APPWRITE_ENDPOINT: '',
  APPWRITE_PROJECT_ID: '',
  APPWRITE_AUTH_API_KEY: '',
  APPWRITE_API_KEY: '',
};
const server = spawn('npx', ['next', 'start', '-p', PORT], {
  cwd: process.cwd(),
  env,
  shell: true,
  stdio: 'ignore',
});

try {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await sleep(1000);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const [nome, rota] of ROTAS) {
    const resp = await page.goto(BASE + rota, { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 700));
    });
    await page.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
    console.log(`${nome.padEnd(18)} ${resp?.status()}  ${page.url().replace(BASE, '') || '/'}`);
  }
  await browser.close();
} finally {
  server.kill();
}
