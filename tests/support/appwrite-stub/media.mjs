/**
 * Arquivos de mídia do stub — EXCLUSIVOS DE TESTE.
 *
 * Precisa ser PNG de VERDADE, não bytes arbitrários: o navegador só dispara `load`
 * (e só o fallback deixa de aparecer) se conseguir decodificar a imagem. Bytes
 * falsos provariam o caminho de erro, que é o oposto do que se quer provar aqui.
 *
 * O PNG é montado à mão (assinatura + IHDR + IDAT + IEND) com `deflateSync`: são
 * ~40 linhas contra uma dependência de imagem só para o teste. A cor sólida é de
 * propósito — o print fica legível e nenhuma assertiva depende de detalhe do
 * desenho.
 */
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** PNG truecolor de cor sólida, `width`×`height`. */
export function pngBytes(width, height, [red, green, blue]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 2; // truecolor RGB
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: width }, () => [red, green, blue]).flat()),
  ]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Os arquivos que "existem no bucket" do stub. Os ids são opacos de propósito —
 * nenhum deles carrega significado, como os do Appwrite.
 */
export const MEDIA_FILES = new Map([
  ['zzcapa00001desafio', { mimeType: 'image/png', bytes: pngBytes(320, 180, [201, 162, 39]) }],
  ['zzcapa00002recompensa', { mimeType: 'image/png', bytes: pngBytes(320, 180, [43, 111, 96]) }],
  // Existe no bucket e NENHUMA linha do catálogo aponta para ele: é o que prova
  // que a rota nega por referência, e não só por chave.
  ['zzcapa00003semdono', { mimeType: 'image/png', bytes: pngBytes(320, 180, [120, 60, 140]) }],
]);
