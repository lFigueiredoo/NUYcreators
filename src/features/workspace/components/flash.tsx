'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck, X } from 'lucide-react';
import { FLASH_PARAM } from '../domain/flash';
import styles from '../styles/app.module.css';

/**
 * Aviso de ação concluída, do lado de DESTINO da navegação.
 *
 * A mensagem nasce na URL que o servidor escolheu (`flashHref`), sobrevive à
 * revalidação que desmonta o formulário e fica na tela até a creator sair dela.
 * Quatro decisões, cada uma com um defeito medido atrás:
 *
 *  1. o parâmetro é limpo da URL assim que o aviso é adotado, então recarregar a
 *     página NÃO traz a confirmação de volta;
 *  2. a mensagem vive em estado do próprio componente: a limpeza da URL provoca
 *     uma navegação de verdade (o router precisa saber da URL nova) e sem esse
 *     estado o aviso sumiria no mesmo instante em que aparece;
 *  3. sair da tela zera o aviso — ele é da ação, não da sessão;
 *  4. adotar um aviso novo leva a tela ao TOPO, que é onde o aviso está. Medido no
 *     print de uma ação real: a volta PRESERVA a rolagem de quem estava com o
 *     formulário à vista, e a faixa — no topo do documento — ficava atrás do
 *     cabeçalho fixo, com o texto escondido. Havia confirmação e não havia como
 *     percebê-la.
 *
 * Nada aqui decide sucesso: o parâmetro só é escrito por action que gravou.
 */
export function Flash() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const announced = params.get(FLASH_PARAM) ?? '';
  // Aviso ADOTADO: em que tela ele nasceu e com que texto. Adotar durante a
  // renderização (e não num efeito) mantém uma coisa só: o aviso já sai no HTML
  // do destino, sem render extra, e sobrevive à limpeza da URL logo abaixo.
  const [seen, setSeen] = useState({ path: pathname, message: announced });
  const handled = useRef('');
  if (announced && (announced !== seen.message || pathname !== seen.path))
    setSeen({ path: pathname, message: announced });

  useEffect(() => {
    // `params` troca de identidade a cada render: sem esta trava, um aviso só
    // seria adotado várias vezes — e cada adoção puxaria a tela para o topo de
    // novo, brigando com quem rolou a página depois de ler.
    if (!announced || announced === handled.current) return;
    handled.current = announced;
    window.scrollTo(0, 0);
    const rest = new URLSearchParams(params);
    rest.delete(FLASH_PARAM);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [announced, params, pathname, router]);

  const message = announced || (pathname === seen.path ? seen.message : '');
  if (!message) return null;
  return (
    <div className={styles.flash}>
      <p className={styles.flashText} role="status" aria-live="polite">
        <CircleCheck size={16} aria-hidden="true" />
        {message}
      </p>
      <button
        type="button"
        className={styles.flashClose}
        aria-label="Fechar aviso"
        onClick={() => setSeen({ path: pathname, message: '' })}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
