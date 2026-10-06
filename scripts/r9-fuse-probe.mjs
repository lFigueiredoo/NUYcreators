import sharp from 'sharp';

// R9 round 7 — medir a fusão cena↔fundo por números:
// A) céu do recorte scene-hero (linhas do topo) = cor que a borda precisa
//    esconder/igualar;
// B) glow do arco na referência (janela atrás do arco) = cor do halo;
// C) luminância da borda superior da V3 (onde o retângulo aparece).

const scene = await sharp('public/brand/v3/scene-hero.webp')
  .raw()
  .toBuffer({ resolveWithObject: true });
const S = scene.info;
const px = (img, x, y) => {
  const i = (y * img.info.width + x) * img.info.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const avg = (img, x0, y0, x1, y1, step = 4) => {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = y0; y < y1; y += step)
    for (let x = x0; x < x1; x += step) {
      const [R, G, B] = px(img, x, y);
      r += R;
      g += G;
      b += B;
      n++;
    }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
};

console.log('scene', S.width, 'x', S.height, 'ch', S.channels);
for (const [a, b] of [
  [0, 16],
  [16, 48],
  [48, 96],
]) {
  console.log(`scene céu y${a}-${b}:`, avg(scene, 100, a, S.width - 100, b));
}
console.log('scene centro do arco (janela):', avg(scene, 400, 260, 760, 620));

const ref = await sharp('artifacts/r9/reference-hero.png')
  .raw()
  .toBuffer({ resolveWithObject: true });
console.log('ref glow atrás do arco x1150-1600 y40-160:', avg(ref, 1150, 40, 1600, 160));
console.log('ref glow núcleo x1250-1450 y120-300:', avg(ref, 1250, 120, 1450, 300));
console.log('ref navy de apoio x200-900 y60-140:', avg(ref, 200, 60, 900, 140));

const v3 = await sharp('artifacts/r9/checkpoint-a/v3-hero-1920.png')
  .raw()
  .toBuffer({ resolveWithObject: true });
console.log('v3 borda topo da cena x1250-1750 y30-70:', avg(v3, 1250, 30, 1750, 70));
console.log('v3 fundo à esquerda da cena x1120-1220 y100-500:', avg(v3, 1120, 100, 1220, 500));
console.log('v3 atrás do headline x420-900 y140-320:', avg(v3, 420, 140, 900, 320));
console.log('ref atrás do headline x380-900 y140-320:', avg(ref, 380, 140, 900, 320));
