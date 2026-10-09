'use client';
import { useState, type ReactNode } from 'react';
import { mediaHref } from '../domain/media';
import styles from '../styles/app.module.css';

/**
 * A imagem do item de catálogo — ou a inicial do nome, quando não há imagem.
 *
 * A inicial era o único desenho possível enquanto não existia arquivo; ela
 * continua sendo o desenho de quando não há imagem, e agora também o de quando a
 * imagem não pôde ser entregue. Os dois casos caem no MESMO lugar de propósito:
 * a creator vê um cartão inteiro, nunca um ícone de imagem quebrada.
 *
 * A caixa é a mesma nos dois casos, então a troca não empurra o layout.
 *
 * Quem serve os bytes é a rota `/app/midia/<id>` (o bucket é privado e o arquivo
 * não tem permissão de leitura): o navegador não fala com o Appwrite, e nenhuma
 * chave sai do servidor.
 *
 * ## Duas portas para o mesmo erro, porque uma só não basta
 *
 * `onError` cobre a falha que acontece DEPOIS de o React hidratar. Mas o 404 volta
 * em milissegundos, e hidratar leva mais que isso: o evento chega quando ainda não
 * há listener, e o React nunca fica sabendo — medido no E2E, onde a imagem
 * continuava quebrada na tela. Por isso o `ref` também lê o DOM depois do commit:
 * `complete` com `naturalWidth` 0 é o mesmo fato, agora legível.
 *
 * `cover` é o desenho institucional de quando não há imagem — a composição da
 * marca que os cartões e a capa do detalhe usam (`CoverFallback`). Ele vale para
 * os dois casos (sem arquivo e arquivo que não pôde ser entregue), porque o olho
 * vê a mesma coisa. Onde não é passado, o desenho continua sendo a inicial, que é
 * o certo nas miniaturas de 56px das listas: naquele tamanho a letra lê melhor
 * que qualquer composição.
 */
export function CatalogMedia({
  fileId,
  name,
  cover,
}: {
  fileId: string | null;
  name: string;
  cover?: ReactNode;
}) {
  const href = mediaHref(fileId);
  const [broken, setBroken] = useState(false);
  const initial = (name.trim()[0] ?? 'N').toUpperCase();

  if (!href || broken) return <>{cover ?? <span aria-hidden="true">{initial}</span>}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={href}
      alt=""
      className={styles.catalogMediaImg}
      loading="lazy"
      ref={(node) => {
        // O erro pode ter acontecido ANTES desta linha existir.
        if (node?.complete && node.naturalWidth === 0) setBroken(true);
      }}
      onError={() => setBroken(true)}
    />
  );
}
