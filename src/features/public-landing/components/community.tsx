import Image from 'next/image';
import styles from '../styles/landing.module.css';

/**
 * 03 — Comunidade / Creators.
 *
 * REGRA CRÍTICA: não existe creator fictícia, @ inventado, número de seguidores
 * nem foto de pessoa gerada. Enquanto o backend não tem creators reais, a seção
 * mostra o estado de pré-lançamento — sem grade de caixas vazias, que lê como
 * layout inacabado. A grade entra sozinha quando `creators` chegar.
 */
export type CommunityCreator = {
  id: string;
  name: string;
  handle: string;
  imageUrl: string;
};

export function Community({ creators = [] }: { creators?: readonly CommunityCreator[] }) {
  const hasCreators = creators.length > 0;

  return (
    <section id="comunidade" className={styles.community} aria-labelledby="pl-community-title">
      {/* Marca abstrata de comunidade: três aros concêntricos atrás do texto.
          Sem gente inventada, sem caixa vazia — só presença. Decorativa, então
          fora da árvore de acessibilidade.

          O reveal mora em cada ARO, não no conjunto: o conjunto se centra por
          `translate(-50%, -50%)`, e o reveal é dono do `transform` de quem
          anima — juntos, o centro caía fora e a marca empurrava a página 86px
          para o lado no celular. De quebra, os aros abrem em cascata. */}
      <div className={styles.communityMark} aria-hidden="true">
        <span className={styles.communityRing} data-pl-reveal data-pl-index="0" />
        <span className={styles.communityRing} data-pl-reveal data-pl-index="1" />
        <span className={styles.communityRing} data-pl-reveal data-pl-index="2" />
      </div>

      <p className={styles.eyebrow} data-pl-reveal data-pl-index="1">
        COMUNIDADE
      </p>

      {/* O título descreve o que a seção é, não afirma quem já está nela: sem
          creator real, "conheça quem já faz parte" prometeria gente que a
          própria nota de pré-lançamento desmente. */}
      <h2
        id="pl-community-title"
        className={styles.sectionTitle}
        data-pl-reveal
        data-pl-index="2"
      >
        Feito com quem
        <br />
        cuida da casa
      </h2>

      <p className={styles.sectionBody} data-pl-reveal data-pl-index="3">
        O espaço de quem gosta de dividir a rotina: o que testou, o que deu certo
        <br />e o que deixa a casa com a sua cara.
      </p>

      {hasCreators ? (
        <ul className={styles.creatorGrid}>
          {creators.map((creator, index) => (
            <li
              key={creator.id}
              className={styles.creatorCard}
              data-pl-reveal
              data-pl-index={String(Math.min(index, 3))}
            >
              <Image
                src={creator.imageUrl}
                alt={`Foto de ${creator.name}`}
                width={356}
                height={460}
                sizes="(max-width: 899px) 45vw, 240px"
                className={styles.creatorPhoto}
              />
              <p className={styles.creatorName}>{creator.name}</p>
              <p className={styles.creatorHandle}>{creator.handle}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.communityNote} data-pl-reveal data-pl-index="4">
          Em breve, você vai conhecer quem está criando com a NUY.
        </p>
      )}
    </section>
  );
}
