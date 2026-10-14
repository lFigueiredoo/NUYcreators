import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CirclePlay,
  Download,
  FileText,
  Info,
  LockKeyhole,
  Search,
} from 'lucide-react';
import type {
  AcademyCategory,
  AcademyCourse,
  AcademyLesson,
  AcademyLoad,
  AcademyMaterial,
  AcademyModule,
  AcademyPage,
  AcademyProgress,
} from '../domain';
import styles from '../academy.module.css';
import { CommunityComments } from './comments';
import { LessonProgress } from './lesson-progress';
import type { AcademyComment } from '../domain';

export function AcademyNotice({ text, error = false }: { text?: string; error?: boolean }) {
  return (
    <div className={styles.notice} role="status">
      <Info size={19} aria-hidden="true" />
      <div>
        <strong>{error ? 'Não foi possível carregar' : 'Academia em preparação'}</strong>
        <p>{text ?? 'Os treinamentos aparecerão aqui em breve.'}</p>
      </div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.empty}>
      <BookOpen size={27} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function AcademyCatalog({
  courses,
  categories,
  search,
  category,
  page,
}: {
  courses: AcademyPage<AcademyCourse>;
  categories: AcademyLoad<AcademyCategory>;
  search: string;
  category: string;
  page: number;
}) {
  const invalidSearch = search.trim().length > 0 && search.trim().length < 3;
  const filtered = invalidSearch ? [] : courses.items;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('busca', search);
    if (category) params.set('categoria', category);
    params.set('pagina', String(nextPage));
    return `/app/academia?${params.toString()}`;
  };
  return (
    <div className={styles.page}>
      <header className={`${styles.hero} ${styles.catalogHero}`}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            <BookOpen size={15} /> Academia NUY
          </p>
          <h1>Aprender juntas transforma o que criamos.</h1>
          <p>
            Um espaço para desenvolver suas ideias, criar com confiança e crescer com a comunidade
            NUY.
          </p>
        </div>
        <div className={styles.heroAside}>
          <strong>Seu próximo passo começa aqui.</strong>
          <span>Aulas, materiais e conversas em um só lugar, dentro do NUY Creators.</span>
        </div>
      </header>
      {courses.state !== 'ok' ? (
        <AcademyNotice
          error={courses.state === 'unavailable'}
          text={
            courses.state === 'unavailable'
              ? 'Não conseguimos mostrar os treinamentos agora. Tente novamente mais tarde.'
              : undefined
          }
        />
      ) : null}
      {categories.state === 'unavailable' ? (
        <AcademyNotice error text="Não conseguimos carregar as categorias agora." />
      ) : null}
      <section className={styles.stack} aria-labelledby="academy-catalog-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="academy-catalog-title">Explore os treinamentos</h2>
            <p>Encontre um tema para o seu momento.</p>
          </div>
        </div>
        <form className={`${styles.toolbar} ${styles.catalogToolbar}`} action="/app/academia" method="get">
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar conteúdo</span>
            <input
              name="busca"
              type="search"
              placeholder="Buscar aulas e treinamentos"
              defaultValue={search}
            />
          </label>
          <select
            className={styles.select}
            name="categoria"
            defaultValue={category}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className={styles.button} type="submit">
            Buscar
          </button>
        </form>
        {courses.state === 'ok' && filtered.length ? (
          <div className={styles.grid}>
            {filtered.map((course) => (
              <Link
                className={styles.courseCard}
                href={`/app/academia/${encodeURIComponent(course.slug)}`}
                key={course.id}
              >
                <div className={styles.courseArt}>
                  {course.authorizedCoverUrl ? (
                    // A URL só pode ser preenchida após autorização por curso e sessão.
                    <img
                      className={styles.courseCover}
                      src={course.authorizedCoverUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <BookOpen size={27} aria-hidden="true" />
                  <span>
                    {categories.items.find((item) => item.id === course.categoryId)?.name ??
                      'Treinamento'}
                  </span>
                </div>
                <div className={styles.courseBody}>
                  <h3>{course.title}</h3>
                  <p>{course.summary}</p>
                  <span className={styles.courseArrow}>
                    Conhecer treinamento <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : courses.state === 'ok' ? (
          <Empty
            title={
              invalidSearch
                ? 'Digite ao menos 3 letras para buscar'
                : search || category
                  ? 'Nenhum resultado para este filtro'
                  : 'Os treinamentos chegam em breve'
            }
            text={
              invalidSearch
                ? 'Assim podemos encontrar o conteúdo certo para você.'
                : search || category
                  ? 'Tente outro termo ou escolha todas as categorias.'
                  : 'Quando a equipe publicar o primeiro treinamento, ele aparecerá aqui para você.'
            }
          />
        ) : null}
        {courses.state === 'ok' && !invalidSearch && (page > 1 || courses.hasNext) ? (
          <nav className={styles.pagination} aria-label="Páginas dos treinamentos">
            {page > 1 ? <Link href={pageHref(page - 1)}>Página anterior</Link> : <span />}
            <span>Página {page}</span>
            {courses.hasNext ? <Link href={pageHref(page + 1)}>Próxima página</Link> : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export function AcademyCourseDetail({
  course,
  courseState,
  modules,
  lessons,
  materials,
  progress,
}: {
  course: AcademyCourse | null;
  courseState: AcademyLoad<AcademyCourse>['state'];
  modules: AcademyLoad<AcademyModule>;
  lessons: AcademyLoad<AcademyLesson>;
  materials: AcademyLoad<AcademyMaterial>;
  progress: AcademyLoad<AcademyProgress>;
}) {
  if (!course)
    return (
      <div className={styles.page}>
        <Link className={styles.crumbs} href="/app/academia">
          <ArrowLeft size={15} /> Academia NUY
        </Link>
        <AcademyNotice
          error={courseState === 'unavailable'}
          text={
            courseState === 'unavailable'
              ? 'Não conseguimos abrir este treinamento agora. Tente novamente mais tarde.'
              : courseState === 'pending'
                ? 'Este treinamento estará disponível em breve.'
                : 'Este treinamento não está disponível.'
          }
        />
      </div>
    );
  const done = new Set(progress.items.map((entry) => entry.lessonId));
  const completed = lessons.items.filter((lesson) => done.has(lesson.id)).length;
  const nextLesson = lessons.items.find((lesson) => !done.has(lesson.id));
  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Trilha de navegação">
        <Link href="/app/academia">Academia NUY</Link>
        <span>/</span>
        <span>{course.title}</span>
      </nav>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Treinamento NUY</p>
          <h1>{course.title}</h1>
          <p>{course.summary}</p>
        </div>
        <div className={styles.heroAside}>
          <strong>Aprenda no seu ritmo.</strong>
          <span>
            {lessons.state === 'ok'
              ? `${lessons.items.length} ${lessons.items.length === 1 ? 'aula publicada' : 'aulas publicadas'}`
              : 'Aulas em preparação'}
          </span>
        </div>
      </header>
      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          {course.description ? (
            <section className={styles.panel}>
              <h2>Sobre este treinamento</h2>
              <p>{course.description}</p>
            </section>
          ) : null}
          <section className={styles.panel}>
            <h2>Seu percurso</h2>
            {modules.state === 'unavailable' || lessons.state === 'unavailable' ? (
              <AcademyNotice
                error
                text="Não conseguimos carregar as aulas agora. Tente novamente mais tarde."
              />
            ) : lessons.items.length ? (
              <div className={styles.stack}>
                {modules.items
                  .sort((a, b) => a.order - b.order)
                  .map((module) => (
                    <div key={module.id}>
                      <h3>{module.title}</h3>
                      {module.summary ? <p>{module.summary}</p> : null}
                      <ul className={styles.list}>
                        {lessons.items
                          .filter((lesson) => lesson.moduleId === module.id)
                          .sort((a, b) => a.order - b.order)
                          .map((lesson) => (
                            <li key={lesson.id}>
                              <Link
                                className={styles.listItem}
                                href={`/app/academia/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(lesson.id)}`}
                              >
                                <span>
                                  <CirclePlay size={17} aria-hidden="true" /> {lesson.title}
                                </span>
                                <ArrowRight size={16} aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            ) : (
              <p>Nenhuma aula publicada ainda.</p>
            )}
          </section>
        </div>
        <aside className={styles.stack}>
          <section className={styles.panel}>
            <h2>Seu progresso</h2>
            <p>{progress.state === 'ok' && lessons.state === 'ok'
              ? `${completed} de ${lessons.items.length} aulas concluídas.`
              : 'Não foi possível carregar seu progresso agora.'}</p>
            {nextLesson ? <Link className={styles.button}
              href={`/app/academia/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(nextLesson.id)}`}>
              Continuar aprendendo
            </Link> : <button className={styles.button} type="button" disabled>
              {completed ? 'Treinamento concluído' : 'Continuar aprendendo'}
            </button>}
          </section>
          <section className={styles.panel}>
            <h2>Materiais</h2>
            <p>
              {materials.state === 'unavailable'
                ? 'Não conseguimos carregar os materiais agora.'
                : materials.items.length
                  ? `${materials.items.length} material(is) associado(s).`
                  : 'Os materiais complementares aparecerão aqui.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function AcademyLessonDetail({
  course,
  courseState,
  lesson,
  lessonState,
  materials,
  materialState,
  comments,
  viewerId,
  playbackUrl,
  completed = false,
  progressEnabled = false,
}: {
  course: AcademyCourse | null;
  courseState: AcademyLoad<AcademyCourse>['state'];
  lesson: AcademyLesson | null;
  lessonState: AcademyLoad<AcademyLesson>['state'];
  materials: AcademyMaterial[];
  materialState: AcademyLoad<AcademyMaterial>['state'];
  comments: AcademyLoad<AcademyComment>;
  viewerId: string;
  playbackUrl?: string | null;
  completed?: boolean;
  progressEnabled?: boolean;
}) {
  if (!course || !lesson)
    return (
      <div className={styles.page}>
        <Link className={styles.crumbs} href="/app/academia">
          <ArrowLeft size={15} /> Academia NUY
        </Link>
        <AcademyNotice
          error={courseState === 'unavailable' || lessonState === 'unavailable'}
          text={
            courseState === 'unavailable' || lessonState === 'unavailable'
              ? 'Não conseguimos abrir esta aula agora. Tente novamente mais tarde.'
              : courseState === 'pending' || lessonState === 'pending'
                ? 'Esta aula estará disponível em breve.'
                : 'Esta aula não está disponível.'
          }
        />
      </div>
    );
  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Trilha de navegação">
        <Link href="/app/academia">Academia NUY</Link>
        <span>/</span>
        <Link href={`/app/academia/${encodeURIComponent(course.slug)}`}>{course.title}</Link>
        <span>/</span>
        <span>{lesson.title}</span>
      </nav>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Aula da Academia</p>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
      </div>
      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          {playbackUrl ? (
            <video
              className={styles.videoPlayer}
              controls
              playsInline
              preload="metadata"
              src={playbackUrl}
              aria-label={`Videoaula: ${lesson.title}`}
            />
          ) : (
            <div className={styles.video} role="status">
              <div>
                <LockKeyhole size={32} aria-hidden="true" />
                <p>O vídeo desta aula estará disponível em breve.</p>
              </div>
            </div>
          )}
          <section className={styles.panel}>
            <h2>Materiais desta aula</h2>
            {materialState === 'unavailable' ? (
              <AcademyNotice error text="Não conseguimos carregar os materiais agora." />
            ) : materials.length ? (
              <ul className={styles.list}>
                {materials.map((material) => (
                  <li className={styles.listItem} key={material.id}>
                    <span>
                      <FileText size={17} aria-hidden="true" /> {material.title}
                    </span>
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      type="button"
                      disabled
                      title="Material disponível em breve"
                    >
                      <Download size={15} /> {material.kind === 'pdf' ? 'Abrir PDF' : 'Abrir link'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum material complementar publicado.</p>
            )}
          </section>
          <CommunityComments target="aula" targetId={lesson.id} comments={comments} viewerId={viewerId} />
        </div>
        <aside className={styles.stack}>
          <section className={styles.panel}>
            <h2>Minha aprendizagem</h2>
            <LessonProgress lessonId={lesson.id} completed={completed} enabled={progressEnabled} />
          </section>
          <AcademyNotice text="Alguns recursos desta aula ainda estão sendo preparados." />
        </aside>
      </div>
    </div>
  );
}
