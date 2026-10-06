/**
 * Certificado self-signed para o stub e para o proxy local de captura.
 *
 * Só existe em ambiente de teste: o schema de ambiente da aplicação exige HTTPS
 * no endpoint Appwrite mesmo fora de produção, então o stub fala TLS. Nada
 * disso entra no produto — os arquivos ficam em `.certs/` (ignorado pelo git).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = join(dirname(fileURLToPath(import.meta.url)), 'appwrite-stub', '.certs');

/**
 * Garante o par chave/certificado e devolve os caminhos.
 * @returns {{ key: string, cert: string }}
 */
export function ensureCertificate() {
  const key = join(directory, 'stub.key');
  const cert = join(directory, 'stub.crt');
  if (existsSync(key) && existsSync(cert)) return { key, cert };
  mkdirSync(directory, { recursive: true });
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      cert,
      '-days',
      '365',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'ignore' },
  );
  return { key, cert };
}

/** @returns {{ key: Buffer, cert: Buffer }} */
export function readCertificate() {
  const { key, cert } = ensureCertificate();
  return { key: readFileSync(key), cert: readFileSync(cert) };
}
