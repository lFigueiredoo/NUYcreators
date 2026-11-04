/**
 * Certificado self-signed para o stub e para o proxy local de captura.
 *
 * Só existe em ambiente de teste: o schema de ambiente da aplicação exige HTTPS
 * no endpoint Appwrite mesmo fora de produção, então o stub fala TLS. Nada
 * disso entra no produto — os arquivos ficam em `.certs/` (ignorado pelo git).
 */
import { execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createSecureContext } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { threadId } from 'node:worker_threads';

const directory = join(dirname(fileURLToPath(import.meta.url)), 'appwrite-stub', '.certs');
const lockWaiter = new Int32Array(new SharedArrayBuffer(4));

function validPair(key, cert) {
  if (!existsSync(key) || !existsSync(cert)) return false;
  try {
    createSecureContext({ key: readFileSync(key), cert: readFileSync(cert) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Garante o par chave/certificado e devolve os caminhos.
 * @returns {{ key: string, cert: string }}
 */
export function ensureCertificate() {
  const key = join(directory, 'stub.key');
  const cert = join(directory, 'stub.crt');
  const lock = join(directory, 'generation.lock');
  if (validPair(key, cert)) return { key, cert };
  mkdirSync(directory, { recursive: true });

  // Os workers do Vitest chegam aqui em paralelo. O lock atômico garante que
  // somente um OpenSSL escreva o par; os demais validam o resultado pronto.
  let descriptor;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    try {
      descriptor = openSync(lock, 'wx');
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (validPair(key, cert)) return { key, cert };
      Atomics.wait(lockWaiter, 0, 0, 50);
    }
  }
  if (descriptor === undefined) throw new Error('Tempo esgotado ao gerar o certificado de teste.');

  const runtimeId = `${process.pid}-${threadId}`;
  const temporaryKey = join(directory, `stub-${runtimeId}.key.tmp`);
  const temporaryCert = join(directory, `stub-${runtimeId}.crt.tmp`);
  try {
    if (validPair(key, cert)) return { key, cert };
    rmSync(key, { force: true });
    rmSync(cert, { force: true });
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        temporaryKey,
        '-out',
        temporaryCert,
        '-days',
        '365',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=DNS:localhost,IP:127.0.0.1',
      ],
      { stdio: 'ignore' },
    );
    if (!validPair(temporaryKey, temporaryCert)) {
      throw new Error('O OpenSSL gerou um par TLS inválido para o stub.');
    }
    renameSync(temporaryKey, key);
    renameSync(temporaryCert, cert);
    return { key, cert };
  } finally {
    rmSync(temporaryKey, { force: true });
    rmSync(temporaryCert, { force: true });
    closeSync(descriptor);
    rmSync(lock, { force: true });
  }
}

/** @returns {{ key: Buffer, cert: Buffer }} */
export function readCertificate() {
  const { key, cert } = ensureCertificate();
  return { key: readFileSync(key), cert: readFileSync(cert) };
}
