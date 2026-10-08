'use client';
import { useState } from 'react';
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
 */
export function CatalogMedia({ fileId, name }: { fileId: string | null; name: string }) {
  const href = mediaHref(fileId);
  const [broken, setBroken] = useState(false);
  const initial = (name.trim()[0] ?? 'N').toUpperCase();

  if (!href || broken) return <span aria-hidden="true">{initial}</span>;
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
