import fs from 'node:fs';
const p = 'src/features/community/components/landing-sections.tsx';
let s = fs.readFileSync(p, 'utf8');
if (!/withoutProject/.test(s)) {
  s = s.replace(
    'export function LandingSections() {',
    'export function LandingSections({ withoutProject = false }: { withoutProject?: boolean } = {}) {',
  );
  const openRe = /(\n      <section id="projeto" className=\{acquisition\.project\}>)/;
  if (!openRe.test(s)) throw new Error('project opener not found');
  s = s.replace(openRe, '\n      {!withoutProject && ($1');
  const closeNeedle = '\n      <section id="como-funciona" className={acquisition.how}>';
  if (!s.includes(closeNeedle)) throw new Error('como-funciona opener not found');
  s = s.replace(closeNeedle, '\n      )}\n' + closeNeedle);
  fs.writeFileSync(p, s);
  console.log('patched');
} else {
  console.log('already patched');
}
