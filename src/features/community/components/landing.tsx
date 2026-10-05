import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkle,
  Sparkles,
  Gift,
  Heart,
  NotebookPen,
  Users,
  Flower2,
} from 'lucide-react';
import { Hero } from './hero';
import { HowItWorks, HowRibbon } from './how-it-works';
import { LevelsSection } from './levels-section';
import { FAQ } from './faq';
import styles from './landing.module.css';
import acquisition from './acquisition.module.css';

const benefits = [
  [Sparkles, 'Desafios criativos', 'Convites para explorar seu olhar e criar com propósito.'],
  [Flower2, 'Pontos NUY', 'Reconhecimento pela participação, conforme as regras da comunidade.'],
  [Gift, 'Produtos e kits', 'Novas formas de descobrir o universo de cuidados NUY.'],
  [Heart, 'Experiências exclusivas', 'Possibilidades que aproximam você da marca.'],
  [NotebookPen, 'Conteúdos e novidades', 'Inspiração para trazer mais significado à rotina.'],
  [Users, 'Comunidade NUY', 'Um espaço de troca, conexão e criação.'],
] as const;

const audiences = [
  [Sparkle, 'Clientes NUY', 'Quem já vive a marca no dia a dia.'],
  [Gift, 'Creators UGC', 'Quem transforma rotina em conteúdo autêntico.'],
  [Heart, 'Influenciadores', 'Quem inspira audiências com recomendações reais.'],
  [Users, 'Apaixonados pela marca', 'Quem transforma pequenos momentos em inspiração.'],
] as const;

export function Landing({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <>
      <Hero authenticated={authenticated} />
      <div className={`${styles.landingFlow} ${acquisition.flow}`}>
        <section id="projeto" className={acquisition.project}>
          <figure className={acquisition.projectBloom} aria-hidden="true" data-image-reveal>
            <Image
              src="/brand/reference/project-bloom-mass.webp"
              alt=""
              width={532}
              height={598}
              quality={90}
              sizes="(max-width:760px) 30vw, 24vw"
            />
          </figure>
          <figure className={acquisition.projectFloralL} aria-hidden="true" data-image-reveal>
            <Image
              src="/brand/reference/project-floral-l.webp"
              alt=""
              width={248}
              height={264}
              quality={90}
              sizes="(max-width:760px) 24vw, 6.95vw"
            />
          </figure>
          <div data-reveal>
            <p className={acquisition.eyebrow}>01 / O projeto</p>
            <h2>
              Mais que uma comunidade.
              <br />
              <em>Um espaço para criar, compartilhar e conquistar.</em>
            </h2>
          </div>
          <div className={acquisition.projectText} data-reveal>
            <span className={acquisition.projectMark} aria-hidden="true">
              ✧
            </span>
            <p>
              NUY Creators é a comunidade oficial da NUY para clientes, creators e influenciadores
              que querem transformar suas experiências com a marca em conteúdo, conexão e novas
              possibilidades.
            </p>
            <p className={acquisition.small}>
              Feito para pessoas reais. Para o seu olhar, sua rotina e suas histórias.
            </p>
          </div>
        </section>
        <section id="como-funciona" className={acquisition.how}>
          <figure className={acquisition.comoFloralL} aria-hidden="true" data-image-reveal>
            {/* Metade NAVY da flor que atravessa a fronteira Projeto→Como: a
                metade creme acima é o project-floral-l (multiply). Ref img
                0–52×565–610 com miolo âmbar sobre o navy — a mesma flor segue
                na seção, como na referência. */}
            <Image
              src="/brand/reference/how-floral-l.webp"
              alt=""
              width={208}
              height={180}
              quality={90}
              sizes="(max-width:760px) 18vw, 6.93vw"
            />
          </figure>
          <HowRibbon />
          <div data-reveal>
            <p className={acquisition.eyebrow}>02 / Como funciona</p>
            <h2>
              Simples de começar.
              <br />
              <em>Especial de viver.</em>
            </h2>
          </div>
          <HowItWorks />
          <figure className={acquisition.comoFloralR} aria-hidden="true" data-image-reveal>
            {/* Blossom entrando pela borda direita (crop da ref; o fragmento
                do fio dourado baked derrete por máscara CSS). */}
            <Image
              src="/brand/reference/como-floral-r.webp"
              alt=""
              width={304}
              height={336}
              quality={90}
              sizes="(max-width:760px) 21vw, 8.75vw"
            />
          </figure>
        </section>
        <section id="para-quem" className={acquisition.audience}>
          <figure className={acquisition.pqFloral} aria-hidden="true" data-image-reveal>
            {/* Jasmão do canto inferior-esquerdo (ref img 0–52×806–884): senta
                contra a base da seção, cortado na borda esquerda. */}
            <Image
              src="/brand/reference/para-quem-floral.webp"
              alt=""
              width={208}
              height={280}
              quality={90}
              sizes="(max-width:760px) 13vw, 6vw"
            />
          </figure>
          <div data-reveal>
            <p className={acquisition.eyebrow}>03 / Para quem é</p>
            <h2>
              Feito para quem transforma
              <br />
              <em>rotina em inspiração.</em>
            </h2>
            <p>Não é sobre parecer alguém. É sobre compartilhar o que faz sentido para você.</p>
          </div>
          <ul className={acquisition.audienceList} data-reveal>
            {audiences.map(([Icon, label, hint]) => (
              <li key={label} tabIndex={0}>
                <Icon size={20} aria-hidden="true" />
                <h3 className={acquisition.audienceLabel}>{label}</h3>
                <p className={acquisition.audienceHint}>{hint}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="beneficios" className={acquisition.benefits}>
          <figure className={acquisition.benefitsFloral} aria-hidden="true" data-image-reveal>
            {/* Coluna floral da ref (img 0–48×886–1024): massa contínua
                hugging a borda esquerda, à esquerda do h2, cortada na base. */}
            <Image
              src="/brand/reference/benefits-floral.webp"
              alt=""
              width={192}
              height={552}
              quality={90}
              sizes="(max-width:760px) 12vw, 5.5vw"
            />
          </figure>
          <div data-reveal>
            <p className={acquisition.eyebrow}>04 / Benefícios</p>
            <h2>
              Participar abre
              <br />
              <em>novas possibilidades.</em>
            </h2>
          </div>
          <ul className={acquisition.benefitList}>
            {benefits.map(([Icon, title, text]) => (
              <li key={title} data-reveal>
                <Icon size={21} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <LevelsSection />
        <section id="experiencias" className={acquisition.experiences}>
          <div data-reveal>
            <p className={acquisition.eyebrow}>06 / Experiências</p>
            <h2>
              Sua participação pode
              <br />
              abrir <em>novas experiências.</em>
            </h2>
            {/* Quebras como na referência: a 1ª linha morre no "e", a 2ª avança
                até "próximo." — o rhythm das duas linhas desiguais. */}
            <p>
              Pequenos cuidados, novas descobertas e <br />
              momentos para viver a NUY de um jeito mais próximo.
            </p>
            <ul className={acquisition.categories}>
              {['Produtos NUY', 'Kits exclusivos', 'Benefícios', 'Experiências'].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <Link href="/cadastro" className={`${styles.primaryButton} ${acquisition.expButton}`}>
              Faça parte para descobrir <ArrowRight size={16} />
            </Link>
          </div>
          <figure className={acquisition.experienceArt} data-image-reveal>
            {/* Cena de packshot reconstruída do crop oficial da referência
                (scripts/build-scene-asset.mjs): fundo creme contínuo, feather
                nas bordas esquerda/topo e base direita firmes — como na ref. */}
            <Image
              src="/brand/reference/experience-scene-ref.webp"
              alt=""
              width={912}
              height={808}
              quality={90}
              className={acquisition.sceneBase}
              sizes="(max-width:760px) 88vw, (max-width:1279px) 46vw, 47.6vw"
            />
          </figure>
        </section>
        <FAQ />
        <section id="cta-final" className={`${styles.finalCta} ${acquisition.final}`}>
          <div className={acquisition.finalHaze} aria-hidden="true" />
          <Image
            src="/brand/reference/final-portrait-hi.webp"
            alt=""
            width={1155}
            height={770}
            quality={90}
            className={`${styles.finalPortrait} ${acquisition.finalPortrait}`}
            /* Layout real = 88vw (1690px @1920): 48vw servia bitmap 1080
               (difuso no DPR 1) — o slot passa a existir de verdade. */
            sizes="(max-width:760px) 100vw, 88vw"
          />
          {/* Órbitas de luz da ref: fio descendente do topo-esquerda (some
              atrás da cabeça) + elipse aberta à direita do rosto com cume em
              ~(1778, 327)css e cauda cruzando o tecido; faíscas ao redor do
              cume. Cores/geometry afinadas contra artifacts/ref-cta-2x.png. */}
          <svg
            className={acquisition.finalOrbit}
            viewBox="0 0 1920 877"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="orbit-arc-fade"
                gradientUnits="userSpaceOnUse"
                x1="1340"
                y1="0"
                x2="1870"
                y2="0"
              >
                <stop offset="0" stopColor="#caa057" stopOpacity="0" />
                <stop offset="0.32" stopColor="#caa057" stopOpacity="0.5" />
                <stop offset="0.66" stopColor="#ffd98f" stopOpacity="0.95" />
                <stop offset="0.88" stopColor="#c88f3d" stopOpacity="0.7" />
                <stop offset="1" stopColor="#c88f3d" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="orbit-line-fade"
                gradientUnits="userSpaceOnUse"
                x1="60"
                y1="0"
                x2="1430"
                y2="210"
              >
                <stop offset="0" stopColor="#d8b073" stopOpacity="0" />
                <stop offset="0.4" stopColor="#d8b073" stopOpacity="0.42" />
                <stop offset="0.82" stopColor="#f0cd8b" stopOpacity="0.55" />
                <stop offset="1" stopColor="#d8b073" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M70 -8C380 58 830 120 1230 168C1300 176 1362 186 1404 196"
              fill="none"
              stroke="url(#orbit-line-fade)"
              strokeWidth="7"
              opacity="0.5"
              strokeLinecap="round"
              style={{ filter: 'blur(5px)' }}
            />
            <path
              d="M70 -8C380 58 830 120 1230 168C1300 176 1362 186 1404 196"
              fill="none"
              stroke="url(#orbit-line-fade)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* elipse aberta: entra perto da têmpera, cume à direita do cabelo,
                desce e atravessa o tecido até a cauda */}
            <path
              d="M1390 168C1540 122 1700 152 1798 246C1852 296 1856 356 1806 402C1730 468 1560 512 1428 522C1350 527 1304 519 1272 498"
              fill="none"
              stroke="url(#orbit-arc-fade)"
              strokeWidth="7"
              opacity="0.5"
              strokeLinecap="round"
              style={{ filter: 'blur(5px)' }}
            />
            <path
              d="M1390 168C1540 122 1700 152 1798 246C1852 296 1856 356 1806 402C1730 468 1560 512 1428 522C1350 527 1304 519 1272 498"
              fill="none"
              stroke="url(#orbit-arc-fade)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Poeira dourada ao redor do crest (posições da ref). */}
            <g fill="#f2cd86">
              <circle cx="1502" cy="184" r="2.4" opacity="0.75" />
              <circle cx="1562" cy="92" r="1.7" opacity="0.55" />
              <circle cx="1626" cy="152" r="2" opacity="0.8" />
              <circle cx="1706" cy="212" r="2.8" opacity="0.9" />
              <circle cx="1776" cy="140" r="1.6" opacity="0.5" />
              <circle cx="1832" cy="262" r="2.2" opacity="0.75" />
              <circle cx="1748" cy="422" r="1.8" opacity="0.5" />
              <circle cx="1624" cy="474" r="1.5" opacity="0.45" />
              <circle cx="1660" cy="548" r="2" opacity="0.4" />
              {/* Poeira ref: pontos pequenos dominam — símbolos de estrela
                  encolheram ~40% e mais faíscas de 1.2–1.8px se somam. */}
              <circle cx="1460" cy="122" r="1.2" opacity="0.4" />
              <circle cx="1600" cy="58" r="1.3" opacity="0.45" />
              <circle cx="1884" cy="182" r="1.2" opacity="0.35" />
              <circle cx="1742" cy="76" r="1.5" opacity="0.5" />
              <circle cx="1856" cy="352" r="1.4" opacity="0.4" />
              <path
                d="M0 -5.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z"
                transform="translate(1712 104)"
                opacity="0.8"
              />
              <path
                d="M0 -5.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z"
                transform="translate(1546 306)"
                opacity="0.55"
              />
            </g>
          </svg>
          {/* O bloom da borda esquerda da CTA na ref é um halo rosa-lavanda
              MUITO suave que sangra da página — o patch webp (com fundo
              próprio do mockup) lê como retângulo em qualquer largura; a
              reprodução aqui é CSS puro (duas radiais), medido na ref. */}
          <span className={acquisition.ctaBloomL} aria-hidden="true" />
          <div className={`${styles.finalCopy} ${acquisition.finalCopy}`} data-reveal>
            <h2>
              Seu lugar no
              <br />
              NUY Creators
              <br />
              <em>começa aqui.</em>
            </h2>
            <p>
              Faça parte da comunidade, compartilhe suas experiências <br />e descubra novas
              possibilidades com a NUY.
            </p>
            <div className={acquisition.finalActions}>
              <Link href="/cadastro" className={styles.primaryButton}>
                Quero fazer parte <ArrowRight size={20} />
              </Link>
              <Link href="/login" className={styles.outlineButton}>
                Já tenho uma conta
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
