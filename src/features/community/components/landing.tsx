import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import { Experiences } from './experiences';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import type { CreatorLevel } from '../services/public-data';
import { FAQ } from './faq';
import { LevelsSection } from './levels-section';
export function Landing({ levels, status }: { levels: CreatorLevel[]; status: string }) {
  return (
    <>
      <Hero />
      <section id="comunidade" className="manifesto cream-section section-pad">
        <div className="section-kicker">
          <span className="eyebrow">01 / Nossa essência</span>
          <Sparkles size={24} strokeWidth={1} />
        </div>
        <div className="manifesto-grid">
          <h2>
            A rotina é sua.
            <br />A inspiração
            <br />
            <em>pode ser de todos.</em>
          </h2>
          <div>
            <p className="lead">
              Existem histórias nos pequenos momentos. No cuidado com a casa. Na pausa que acolhe.
              No perfume que fica.
            </p>
            <p>
              NUY Creators é um convite para compartilhar essas histórias. Uma comunidade para criar
              com verdade, trocar experiências e descobrir o que podemos construir juntos.
            </p>
            <a href="#como-funciona" className="text-link">
              Descubra como funciona <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
        <div className="manifesto-bottom">
          <span>Rotinas reais.</span>
          <span>Olhares únicos.</span>
          <span>Criação com presença.</span>
        </div>
      </section>
      <section id="como-funciona" className="section-pad how-section">
        <p className="eyebrow">02 / Do seu olhar para o mundo</p>
        <h2>
          Simples de começar.
          <br />
          <em>Especial de fazer parte.</em>
        </h2>
        <HowItWorks />
      </section>
      <section className="cream-section section-pad creators-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 / Nossa comunidade</p>
            <h2>
              Pessoas que criam.
              <br />
              <em>Histórias que conectam.</em>
            </h2>
          </div>
          <p>
            Uma comunidade nasce de quem chega.
            <br />O próximo olhar pode ser o seu.
          </p>
        </div>
        <EmptyState
          title="A comunidade está começando a florescer."
          description="Perfis públicos aparecerão aqui com autorização de cada creator."
          unavailable
        />
        <Link href="/cadastro" className="text-link">
          Seja parte dessa história <ArrowUpRight size={17} />
        </Link>
      </section>
      <section id="desafio" className="section-pad challenge-section">
        <div>
          <p className="eyebrow">04 / Um convite para criar</p>
          <h2>
            Seu cotidiano.
            <br />
            <em>Um novo desafio.</em>
          </h2>
          <p>
            Descubra propostas para transformar suas experiências com NUY em conteúdo autêntico.
          </p>
          <Button asChild variant="outline">
            <Link href="/desafios">
              Ver desafios <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="challenge-empty">
          <span className="challenge-watermark" aria-hidden="true">
            nuy
          </span>
          <EmptyState
            title="O primeiro convite está sendo preparado."
            description="Nenhum desafio foi publicado nesta versão. Requisitos, prazo e pontos estarão disponíveis antes de participar."
            unavailable
          />
        </div>
      </section>
      <LevelsSection levels={levels} status={status} />
      <section id="recompensas" className="section-pad rewards-section">
        <p className="eyebrow">06 / Criação que volta para você</p>
        <div className="section-heading">
          <h2>
            Novos rituais.
            <br />
            <em>Novas conquistas.</em>
          </h2>
          <Button asChild variant="outline">
            <Link href="/recompensas">
              Explorar recompensas <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="reward-types">
          <span>Produtos</span>
          <span>Kits</span>
          <span>Benefícios</span>
          <span>Experiências</span>
        </div>
        <EmptyState
          title="O catálogo está sendo cuidado."
          description="As recompensas serão apresentadas quando houver itens reais publicados, com custo em pontos e disponibilidade."
          unavailable
        />
      </section>
      <section id="conteudos" className="cream-section section-pad">
        <p className="eyebrow">07 / Conteúdos da comunidade</p>
        <h2>
          Inspiração que nasce
          <br />
          <em>da vida real.</em>
        </h2>
        <EmptyState
          title="Cada história merece seu espaço."
          description="Conteúdos aprovados e autorizados para publicação aparecerão aqui. Ainda não há publicações disponíveis."
          unavailable
        />
      </section>
      <section id="ranking" className="section-pad ranking-section">
        <div>
          <p className="eyebrow">08 / Reconhecer quem inspira</p>
          <h2>
            Uma comunidade.
            <br />
            <em>Muitos talentos.</em>
          </h2>
          <p>O ranking celebra pontos conquistados, não o saldo disponível para resgate.</p>
          <Link href="/ranking" className="text-link">
            Conheça o ranking <ArrowUpRight size={17} />
          </Link>
        </div>
        <EmptyState
          title="As primeiras posições ainda serão conquistadas."
          description="Ranking geral e mensal serão disponibilizados após a ativação da pontuação. Nenhuma classificação fictícia é exibida."
          unavailable
        />
      </section>
      <section className="cream-section section-pad">
        <p className="eyebrow">09 / Experiências NUY</p>
        <h2>
          Mais que criar.
          <br />
          <em>Sentir, viver, compartilhar.</em>
        </h2>
        <Experiences />
      </section>
      <FAQ />
      <section className="final-cta">
        <p className="eyebrow">Seu olhar faz a diferença</p>
        <h2>
          O próximo capítulo
          <br />
          <em>tem a sua essência.</em>
        </h2>
        <p>
          Participe de desafios, compartilhe suas experiências com NUY, acumule Pontos NUY e
          desbloqueie produtos, benefícios e experiências.
        </p>
        <Button asChild>
          <Link href="/cadastro">
            Fazer parte <ArrowUpRight size={18} />
          </Link>
        </Button>
        <span className="cta-flower" aria-hidden="true">
          ✳
        </span>
      </section>
    </>
  );
}
