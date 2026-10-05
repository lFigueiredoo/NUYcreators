import Image from 'next/image';
import styles from './landing.module.css';
import acquisition from './acquisition.module.css';

const names = ['Exploradora', 'Criadora', 'Inspiradora', 'Embaixadora', 'Ícone'];
/* Nós da jornada medidos na referência (painel médio 504×259 → % da seção):
   x 11,66/30,26/48,80/67,39/84,37 · centros y 73,5/64,2/59,3/52,6/48,2. */
const nodePoints: ReadonlyArray<readonly [number, number]> = [
  [11.66, 73.5],
  [30.26, 64.2],
  [48.8, 59.3],
  [67.39, 52.6],
  [84.37, 48.2],
];
/* Feixe: passa pelo centro de cada halo (os halos, opacos, cobrem a costura)
   com curvatura suave — a ref quase desenha um segmento único em leve S.
   O eco (+3 de y) imita a segunda linha do feixe na referência. */
const lane =
  'M11.66 73.5C20 68.5 24 66 30.26 64.2C40 61.5 39 60.8 48.8 59.3C58 57.8 57.6 55 67.39 52.6C74 51 76 50.4 84.37 48.2';
const laneEcho =
  'M12.5 76C21 71 24.5 68 30.26 66.2C39 63.8 39 63.8 48.8 62.3C58 60.8 57.6 58 67.39 55.6C73.5 54.3 75.5 53.4 82.5 51.4';

export function LevelsSection() {
  const stages = names.map((name) => ({ $id: name, name }));
  return (
    <section id="niveis" className={styles.levelSection}>
      <div className={styles.levelIntro} data-reveal>
        <p className={styles.levelEyebrow}>05 / Jornada</p>
        <h2>
          Uma jornada que
          <br />
          <em>evolui com você.</em>
        </h2>
        <p>Participe, crie e evolua dentro da comunidade.</p>
      </div>
      {/* Ornamentos da ref ANTES do levelJourney no DOM: ficam por trás dos
          halos sem precisar de z-index. Posições/tamanhos no ACQUISITION
          (módulo vencedor da cascata). O buquê borboletado cai do corte do
          hero; a orquídea sangra da esquerda; a fita-onda coroa a fronteira
          com o creme (no lugar do antigo arco SVG fraco demais). */}
      <Image
        src="/brand/reference/journey-bouquet-tr-r7.webp"
        alt=""
        width={480}
        height={424}
        quality={90}
        className={acquisition.journeyBouquet}
        sizes="(max-width: 760px) 56vw, 23.2vw"
      />
      <Image
        src="/brand/reference/journey-orchid-l-feathered.webp"
        alt=""
        width={232}
        height={288}
        quality={90}
        className={acquisition.journeyOrchid}
        sizes="(max-width: 760px) 36vw, 12.1vw"
      />
      <div className={styles.levelJourney} data-reveal>
        <svg
          className={styles.journeyLine}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* As densidades compartilham o trajeto (penumbra → halo → núcleo). */}
          <path className={styles.journeyGlow} d={lane} />
          <path className={styles.journeyHalo} d={lane} />
          <path className={styles.journeyCore} d={lane} />
          <path className={styles.journeyEcho} d={laneEcho} />
        </svg>
        <svg
          className={styles.mobileJourneyLine}
          viewBox="0 0 46 295"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Conector vertical mobile: mesmas duas densidades de luz. */}
          <path
            className={styles.mobileJourneyGlow}
            d="M23 20C12 55 34 64 23 81S12 123 23 142S34 184 23 203S12 245 23 264"
          />
          <path
            className={styles.mobileJourneyCore}
            d="M23 20C12 55 34 64 23 81S12 123 23 142S34 184 23 203S12 245 23 264"
          />
        </svg>
        <ol className={styles.journey}>
          {stages.map((level, i) => {
            const [x, y] = nodePoints[i];
            return (
              <li key={level.$id} style={{ left: `${x}%`, top: `${y}%` }} data-reveal>
                <span className={styles.levelHalo} aria-hidden="true">
                  {['✧', '✤', '✳', '❋', '✦'][i % 5]}
                </span>
                <h3>
                  {level.name.replace(/ NUY$/, '')} <small>NUY</small>
                </h3>
              </li>
            );
          })}
        </ol>
      </div>
      {/* A fita no fim do DOM: a luz dourada passa POR CIMA do feixe, como na
          ref — e corre por baixo do buquê/orquídea (zonas separadas). */}
      <Image
        src="/brand/reference/journey-ribbon.webp"
        alt=""
        width={1968}
        height={120}
        quality={90}
        className={acquisition.journeyRibbon}
        /* Desktop roda a 95,4vw (1832px @1920); em telas estreitas a fita
           sangue para 100vw — sem o prefixo, o slot @390 servia 384px. */
        sizes="(max-width:1279px) 100vw, 95.4vw"
      />
    </section>
  );
}
