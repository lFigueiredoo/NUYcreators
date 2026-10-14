import Link from 'next/link';
import { ArrowRight, BookOpen, FolderOpen, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import type {
  AcademyCategory,
  AcademyCommentStatus,
  AcademyCourse,
  AcademyLoad,
  AcademyModerationComment,
  AcademyPage,
  AcademyProgressSummary,
  AcademyReport,
} from '../domain';
import styles from '../academy.module.css';
import { AcademyNotice } from './creator';

const moderationStatusLabel: Record<AcademyCommentStatus, string> = {
  pending: 'Aguardando aprovação',
  visible: 'Visível',
  hidden: 'Oculto',
  rejected: 'Rejeitado',
  unknown: 'Status desconhecido',
};

export function AdminAcademyHome({ courses }: { courses: AcademyPage<AcademyCourse> }) {
  const counts = { draft: 0, published: 0, archived: 0 };
  for (const course of courses.items) counts[course.status]++;
  return (
    <div className={styles.page}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Conteúdo e comunidade</p>
          <h1>Academia NUY</h1>
          <p>Organize a formação das creators no mesmo painel em que você cuida da comunidade.</p>
        </div>
        <div className={styles.editorActions}>
          <Link
            className={`${styles.button} ${styles.buttonSecondary}`}
            href="/admin/academia/categorias"
          >
            Categorias
          </Link>
          <Link className={styles.button} href="/admin/academia/novo">
            <Plus size={17} /> Novo treinamento
          </Link>
        </div>
      </div>
      <AcademyNotice text="A gestão já pode ser revisada localmente. Salvar, publicar, enviar mídia e moderar exigem a migração aprovada e os controles de acesso." />
      <div className={styles.grid} aria-label="Estados dos treinamentos">
        <div className={styles.panel}>
          <span className={styles.muted}>Rascunhos nesta página</span>
          <h2>{courses.state === 'ok' ? counts.draft : '—'}</h2>
          <p>Em preparação pela equipe.</p>
        </div>
        <div className={styles.panel}>
          <span className={styles.muted}>Publicados nesta página</span>
          <h2>{courses.state === 'ok' ? counts.published : '—'}</h2>
          <p>Disponíveis para creators.</p>
        </div>
        <div className={styles.panel}>
          <span className={styles.muted}>Arquivados nesta página</span>
          <h2>{courses.state === 'ok' ? counts.archived : '—'}</h2>
          <p>Preservados fora do catálogo.</p>
        </div>
      </div>
      <section className={styles.stack}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Treinamentos</h2>
            <p>Rascunhos e publicações do módulo.</p>
          </div>
        </div>
        {courses.items.length ? (
          <div className={styles.grid}>
            {courses.items.map((course) => (
              <Link
                className={styles.courseCard}
                href={`/admin/academia/${encodeURIComponent(course.id)}`}
                key={course.id}
              >
                <div className={styles.courseArt}>
                  <BookOpen size={27} />
                  <span>
                    {course.status === 'published'
                      ? 'Publicado'
                      : course.status === 'archived'
                        ? 'Arquivado'
                        : 'Rascunho'}
                  </span>
                </div>
                <div className={styles.courseBody}>
                  <h3>{course.title}</h3>
                  <p>{course.summary}</p>
                  <span className={styles.courseArrow}>
                    Editar treinamento <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <FolderOpen size={27} aria-hidden="true" />
            <h2>
              {courses.state === 'unavailable'
                ? 'Não foi possível ler os treinamentos'
                : 'Nenhum treinamento cadastrado'}
            </h2>
            <p>
              Abra o editor para revisar campos, módulos, aulas e a prévia. Nenhum dado será salvo
              antes da ativação segura.
            </p>
            <Link className={styles.button} href="/admin/academia/novo">
              Abrir editor
            </Link>
          </div>
        )}
      </section>
      {courses.state === 'ok' && (courses.page > 1 || courses.hasNext) ? (
        <nav className={styles.pagination} aria-label="Páginas dos treinamentos">
          {courses.page > 1 ? (
            <Link href={`/admin/academia?pagina=${courses.page - 1}`}>Página anterior</Link>
          ) : (
            <span />
          )}
          <span>Página {courses.page}</span>
          {courses.hasNext ? (
            <Link href={`/admin/academia?pagina=${courses.page + 1}`}>Próxima página</Link>
          ) : null}
        </nav>
      ) : null}
      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2>
            <MessageCircle size={19} /> Comunidade e moderação
          </h2>
          <p>
            Comentários de aulas e desafios, respostas e denúncias serão reunidos nesta fila após a
            migração. A autoria e a permissão de moderação serão verificadas em cada operação.
          </p>
          <Link className={styles.button} href="/admin/academia/comentarios">
            Abrir fila de moderação
          </Link>
        </section>
        <section className={styles.panel}>
          <h2>
            <ShieldCheck size={19} /> Progresso
          </h2>
          <p>
            O acompanhamento individual depende da tabela privada de progresso. Nenhuma informação
            pessoal é exibida antes da configuração de acesso.
          </p>
          <Link className={styles.button} href="/admin/academia/progresso">
            Consultar progresso
          </Link>
        </section>
      </div>
    </div>
  );
}

export function AdminAcademyCategories({
  categories,
}: {
  categories: AcademyLoad<AcademyCategory>;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Organização do catálogo</p>
          <h1>Categorias</h1>
          <p>Os temas ajudam a creator a encontrar o próximo treinamento.</p>
        </div>
        <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/admin/academia">
          Voltar à Academia
        </Link>
      </div>
      <AcademyNotice text="Categorias podem ser revisadas localmente; criação e edição dependem da migração aprovada." />
      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2>Categorias cadastradas</h2>
          {categories.items.length ? (
            <ul className={styles.list}>
              {categories.items.map((item) => (
                <li className={styles.listItem} key={item.id}>
                  <span>{item.name}</span>
                  <span className={styles.muted}>{item.slug}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {categories.state === 'unavailable'
                ? 'Não foi possível ler as categorias.'
                : 'Nenhuma categoria cadastrada.'}
            </p>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Nova categoria</h2>
          <div className={styles.stack}>
            <label className={styles.field}>
              Nome
              <input className={styles.input} placeholder="Nome da categoria" maxLength={255} />
            </label>
            <label className={styles.field}>
              Slug
              <input className={styles.input} placeholder="nome-da-categoria" maxLength={80} />
            </label>
            <label className={styles.field}>
              Descrição
              <textarea
                className={styles.textarea}
                maxLength={1000}
                placeholder="Uma frase sobre o tema"
              />
            </label>
            <button type="button" className={styles.button} disabled>
              Salvar categoria
            </button>
            <p className={styles.muted}>Nenhuma alteração é enviada ao Appwrite.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AdminAcademyComments({
  comments,
  reports,
}: {
  comments: AcademyPage<AcademyModerationComment>;
  reports: AcademyLoad<AcademyReport>;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Comunidade de marca</p>
          <h1>Comentários</h1>
          <p>Conversa por aula ou desafio, com resposta e moderação no mesmo painel.</p>
        </div>
        <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/admin/academia">
          Voltar à Academia
        </Link>
      </div>
      <AcademyNotice text="Responder, ocultar, excluir e resolver denúncias exigem os controles de autoria e moderação da migração." />
      <h2>Fila de comentários</h2>
      {comments.items.length ? (
        <div className={styles.stack}>
          {comments.items.map((comment) => (
            <article className={styles.panel} key={comment.id}>
              <span className={styles.status}>
                {comment.targetType === 'lesson'
                  ? 'Aula'
                  : comment.targetType === 'challenge'
                    ? 'Desafio'
                    : 'Alvo desconhecido'}{' '}
                · {comment.targetTitle}
              </span>
              <p>{comment.body}</p>
              <p className={styles.muted}>
                {comment.authorName} · {moderationStatusLabel[comment.status]} ·{' '}
                {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {reports.items.some((report) => report.commentId === comment.id) ? (
                <p className={styles.muted}>
                  {reports.items.filter((report) => report.commentId === comment.id).length}{' '}
                  denúncia(s) relacionada(s) ·{' '}
                  {reports.items
                    .filter((report) => report.commentId === comment.id)
                    .map((report) => report.reason)
                    .join('; ')}
                </p>
              ) : null}
              <div className={styles.editorActions}>
                <button className={styles.button} type="button" disabled>
                  Responder
                </button>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button"
                  disabled
                >
                  Ocultar
                </button>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button"
                  disabled
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <MessageCircle size={27} />
          <h2>
            {comments.state === 'unavailable'
              ? 'Não foi possível ler a fila'
              : 'Nenhum comentário para moderar'}
          </h2>
          <p>Os comentários de aulas e desafios aparecerão aqui quando o módulo estiver ativo.</p>
        </div>
      )}
      {comments.state === 'ok' && (comments.page > 1 || comments.hasNext) ? (
        <nav className={styles.pagination} aria-label="Páginas dos comentários">
          {comments.page > 1 ? (
            <Link href={`/admin/academia/comentarios?pagina=${comments.page - 1}`}>
              Página anterior
            </Link>
          ) : (
            <span />
          )}
          <span>Página {comments.page}</span>
          {comments.hasNext ? (
            <Link href={`/admin/academia/comentarios?pagina=${comments.page + 1}`}>
              Próxima página
            </Link>
          ) : null}
        </nav>
      ) : null}
      <section className={styles.stack} aria-label="Denúncias">
        <h2>Denúncias</h2>
        {reports.items.length ? (
          reports.items.map((report) => (
            <article className={styles.panel} key={report.id}>
              <span className={styles.status}>{report.status}</span>
              <p>{report.reason}</p>
              <p className={styles.muted}>Comentário relacionado · revisão pela equipe</p>
              <button className={styles.button} type="button" disabled>
                Resolver denúncia
              </button>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <ShieldCheck size={27} aria-hidden="true" />
            <h3>
              {reports.state === 'unavailable'
                ? 'Não foi possível ler as denúncias'
                : 'Nenhuma denúncia para revisar'}
            </h3>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminAcademyProgress({
  progress,
}: {
  progress: AcademyLoad<AcademyProgressSummary>;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Aprendizagem</p>
          <h1>Progresso</h1>
          <p>Acompanhe a conclusão das aulas com acesso restrito à equipe autorizada.</p>
        </div>
        <Link className={`${styles.button} ${styles.buttonSecondary}`} href="/admin/academia">
          Voltar à Academia
        </Link>
      </div>
      <AcademyNotice text="A consulta individual será liberada somente após a tabela privada e a política de acesso serem aprovadas." />
      <section className={styles.panel}>
        <h2>Conclusões registradas</h2>
        <p>
          {progress.state === 'ok'
            ? `${progress.items[0]?.completedLessons ?? 0} conclusão(ões) registradas.`
            : 'Nenhum dado de progresso disponível neste ambiente.'}
        </p>
        <p className={styles.muted}>
          Nomes e histórico individual permanecem ocultos até a revisão de privacidade.
        </p>
      </section>
    </div>
  );
}
