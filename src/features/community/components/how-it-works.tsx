import styles from './landing.module.css';

const steps = [
  ['Faça parte', 'Crie sua conta e encontre seu lugar na comunidade.'],
  ['Participe', 'Descubra os convites criativos e as novidades da NUY.'],
  ['Crie', 'Compartilhe seu olhar sobre casa, perfume, rotina e bem-estar.'],
  ['Conquiste', 'Evolua com as criações aprovadas e descubra novas experiências.'],
];

/* Nós da fita (viewBox 866×185 — o painel desktop da referência): acima de cada
   passo, em (x, y) medidos no mockup → n1 37,8%/35%, n2 51,2%/31%, n3 67,2%/44%,
   n4 82,8%/36% da seção. */
const nodes: ReadonlyArray<readonly [number, number]> = [
  [328, 65],
  [443, 58],
  [582, 81],
  [717, 67],
];

/* Fita caligráfica da referência: corre rente ao canto inferior-esquerdo, sobe
   até o primeiro nó, ondula suave (crista entre os nós 1→2), desce ao nó 3 e
   sai à direita subindo. Passeia ACIMA das colunas de texto — nunca cruza
   título nem parágrafo (canais verificados no E2E). */
/* Fita caligráfica da referência: corre rente ao canto inferior-esquerdo, sobe
   até o primeiro nó, ondula suave (crista entre os nós 1→2), desce ao nó 3 e
   sai à direita subindo. Passeia ACIMA das colunas de texto — nunca cruza
   título nem parágrafo (canais verificados no E2E). R7: ondulação orgânica
   da ref — os vales entre nós desigualam (sem senoide regular). */
const ribbon =
  'M-12 146C88 158 216 148 328 66C366 38 424 36 443 58C478 84 536 100 582 82C636 58 662 40 717 63C754 60 822 44 874 26';
const echo =
  'M-12 152C90 164 218 154 328 72C368 44 426 42 443 64C480 92 538 106 582 88C638 64 664 46 717 69C756 65 824 49 874 32';
/* Depois do nó 4 a fita se desfez: um fio fino desce à direita (a bifurcação
   da referência). */
const tail = 'M717 66C760 72 806 90 866 116';

function Blossom() {
  return (
    <g className={styles.howNodeBlossom}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} rx="2.5" ry="4.6" cy="-4.6" transform={`rotate(${deg})`} />
      ))}
      <circle r="1.7" cx="0" cy="0" className={styles.howNodeHeart} />
    </g>
  );
}

/** Camada da fita + nós: filha direta da seção (posição absoluta sobre ela). */
export function HowRibbon() {
  return (
    <svg
      className={styles.howRibbon}
      viewBox="0 0 866 185"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="how-ribbon-grad" x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#b9924f" />
          <stop offset=".45" stopColor="#f0c98d" />
          <stop offset="1" stopColor="#f8e6c0" />
        </linearGradient>
        <filter id="how-ribbon-soft" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="how-node-soft" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <path className={styles.howRibbonGlow} d={ribbon} filter="url(#how-ribbon-soft)" />
      <path className={styles.howRibbonLine} d={ribbon} />
      <path className={styles.howRibbonEcho} d={echo} />
      <path className={styles.howRibbonEcho} d={tail} />
      {nodes.map(([cx, cy]) => (
        <g key={cx} className={styles.howNode}>
          <circle
            cx={cx}
            cy={cy}
            r="13.5"
            className={styles.howNodeGlow}
            filter="url(#how-node-soft)"
          />
          {/* Halo pictórico sob o aro: mancha violeta-quente desfocada — o nó
              lê como flor de luz, não como círculo+glifo secos. */}
          <circle cx={cx} cy={cy} r="11.5" className={styles.howNodeHalo} />
          <circle cx={cx} cy={cy} r="11.5" className={styles.howNodeRing} />
          <g transform={`translate(${cx} ${cy}) scale(1.15)`}>
            <Blossom />
          </g>
        </g>
      ))}
    </svg>
  );
}

export function HowItWorks() {
  return (
    <ol className={styles.steps}>
      {steps.map(([title, text], i) => (
        <li key={title} data-reveal>
          <span className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
