import { expect, it } from 'vitest';
import {
  MEDIA_MAX_BYTES,
  mediaExtension,
  mediaHref,
  mediaIssue,
  looksLikeFormat,
} from '../../src/features/workspace/domain/media';

/**
 * O que entra como capa de catálogo, e por onde ela é servida.
 *
 * O teste que importa aqui é o da ASSINATURA: `File.type` vem do cliente, então
 * um `.exe` renomeado para `.png` chega declarando `image/png`. Se a decisão
 * fosse pela etiqueta, ele passaria.
 */

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0,
]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

function file(
  over: Partial<{ name: string; declaredType: string; size: number; head: Uint8Array }>,
) {
  return {
    name: 'capa.png',
    declaredType: 'image/png',
    size: 120_000,
    head: PNG,
    ...over,
  };
}

it('aceita os três formatos quando o conteúdo bate com a extensão', () => {
  expect(mediaIssue(file({ name: 'capa.png', declaredType: 'image/png', head: PNG }))).toBe(null);
  expect(mediaIssue(file({ name: 'capa.jpg', declaredType: 'image/jpeg', head: JPEG }))).toBe(null);
  expect(mediaIssue(file({ name: 'capa.jpeg', declaredType: 'image/jpeg', head: JPEG }))).toBe(
    null,
  );
  expect(mediaIssue(file({ name: 'capa.webp', declaredType: 'image/webp', head: WEBP }))).toBe(
    null,
  );
});

it('o CONTEÚDO decide: .png com bytes de executável é recusado, apesar do tipo declarado', () => {
  const issue = mediaIssue(file({ name: 'inocente.png', declaredType: 'image/png', head: EXE }));
  expect(issue).toMatch(/não é PNG/);
});

it('extensão fora da lista não passa, nem com tipo declarado de imagem', () => {
  expect(mediaIssue(file({ name: 'capa.gif', declaredType: 'image/gif' }))).toMatch(
    /Formato não aceito/,
  );
  expect(mediaIssue(file({ name: 'capa.svg', declaredType: 'image/svg+xml' }))).toMatch(
    /Formato não aceito/,
  );
  expect(mediaIssue(file({ name: 'capa', declaredType: 'image/png' }))).toMatch(
    /Formato não aceito/,
  );
});

it('tipo declarado incoerente com a extensão não passa', () => {
  // Navegador que declara outra coisa: a segunda barreira pega antes do conteúdo.
  expect(mediaIssue(file({ name: 'capa.png', declaredType: 'application/pdf' }))).toMatch(
    /não parece ser PNG/,
  );
});

it('vazio e acima do teto são recusados com o limite dito', () => {
  expect(mediaIssue(file({ size: 0 }))).toMatch(/vazio/);
  const issue = mediaIssue(file({ size: MEDIA_MAX_BYTES + 1 }));
  expect(issue).toMatch(/5 MB/);
  // Exatamente no teto passa: o limite é "até", não "abaixo de".
  expect(mediaIssue(file({ size: MEDIA_MAX_BYTES }))).toBe(null);
});

it('WEBP é reconhecido pelo par RIFF/WEBP, com o tamanho variável no meio', () => {
  expect(looksLikeFormat('webp', WEBP)).toBe(true);
  expect(looksLikeFormat('webp', PNG)).toBe(false);
  // RIFF de um WAV não é WEBP: o segundo pedaço é que decide.
  const wav = new Uint8Array(WEBP);
  wav[8] = 0x57;
  wav[9] = 0x41;
  wav[10] = 0x56;
  wav[11] = 0x45;
  expect(looksLikeFormat('webp', wav)).toBe(false);
});

it('mediaExtension lê a última extensão e ignora maiúsculas', () => {
  expect(mediaExtension('Capa.PNG')).toBe('png');
  expect(mediaExtension('foto.da.capa.jpeg')).toBe('jpeg');
  expect(mediaExtension('sem-ponto')).toBe('');
});

it('o endereço é uma rota nossa, e só id de arquivo vira endereço', () => {
  expect(mediaHref('6ac700280267dff1da91')).toBe('/app/midia/6ac700280267dff1da91');
  expect(mediaHref('')).toBe(null);
  expect(mediaHref(null)).toBe(null);
  expect(mediaHref(undefined)).toBe(null);
  // Nada que possa escapar do caminho ou virar outro endereço.
  expect(mediaHref('../../etc/passwd')).toBe(null);
  expect(mediaHref('a/b')).toBe(null);
  expect(mediaHref('id com espaço')).toBe(null);
  expect(mediaHref('a'.repeat(37))).toBe(null);
  expect(mediaHref('a'.repeat(36))).toBe('/app/midia/' + 'a'.repeat(36));
});
