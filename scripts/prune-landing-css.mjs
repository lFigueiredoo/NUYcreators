// R6 dead-CSS pruning for landing.module.css (one-off, verified ranges).
// Each range asserts its first/last line content before cutting; deletions run
// bottom-to-top so line numbers stay valid.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/features/community/components/landing.module.css';
const lines = readFileSync(path, 'utf8').split('\n'); // 0-based index = line-1

const RANGES = [
  // [start, end, expectedFirst, expectedLast]
  [90, 97, '.darkButton {', '}'],
  [114, 120, '.textLink {', '}'],
  [188, 192, '.heroBrand {', '}'],
  [231, 235, '.heroFoot a {', '}'],
  [272, 620, '.communityPanel {', '}'],
  [704, 715, '.journeyFloorGlow {', '}'],
  [849, 867, '.levelBouquet {', '}'],
  [901, 954, '.finalSignature {', '}'],
  [955, 978, '.manifesto {', '}'],
  [1079, 1091, '.faqWrap {', '}'],
  [1096, 1187, '.communityPanel {', '}'],
  [1196, 1202, '.finalSignature > p {', '}'],
  [1227, 1262, '.campaign {', '}'],
  [1320, 1322, '.levelBouquet {', '}'],
  [1360, 1363, '.heroBrand {', '}'],
  [1414, 1451, '.communityPanel {', '}'],
  [1534, 1546, '.levelNote {', '}'],
  [1547, 1635, '.campaign {', '}'],
  [1654, 1679, '.finalSignature {', '}'],
  [1680, 1690, '.manifesto {', '}'],
  [1706, 1708, '.faqWrap :global(.faq-section) {', '}'],
  [1719, 1728, '@media (hover: hover)', '}'],
  [1734, 1747, '.hero :global(.editorial-icons) {', '}'],
  [1759, 1794, '.landingFlow .communityPanel {', '}'],
  [1802, 1869, '.landingFlow .campaign {', '}'],
  [1875, 1901, '.landingFlow .levelBouquet {', '}'],
  [1902, 1942, '.contentsSection {', '}'],
  [1954, 2000, '.landingFlow .communityPanel {', '}'],
  [2006, 2036, '.landingFlow .levelBouquet {', '}'],
  [2085, 2088, '.heroBrand {', '}'],
  [2194, 2196, '.heroBrand {', '}'],
  [2238, 2241, '.heroBrand {', '}'],
];

let fail = 0;
for (const [start, end, first, lastPrefix] of RANGES) {
  const a = lines[start - 1];
  const b = lines[end - 1];
  if (!a.trim().startsWith(first) || b.trim() !== lastPrefix) {
    console.log(`RANGE FAIL ${start}-${end}: first=${JSON.stringify(a)} last=${JSON.stringify(b)}`);
    fail++;
  }
}
if (fail) {
  console.log('ABORT: ranges inconsistent');
  process.exit(1);
}

// Sort descending and delete.
for (const [start, end] of [...RANGES].sort((x, y) => y[0] - x[0])) {
  lines.splice(start - 1, end - start + 1);
}
writeFileSync(path, lines.join('\n'));
console.log('pruned', RANGES.length, 'ranges; new line count:', lines.length);
