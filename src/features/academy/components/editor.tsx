'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAcademyDraftAction, setAcademyCourseStatusAction } from '../services/actions';
import { ArrowLeft, ArrowDown, ArrowUp, BookOpen, FileText, Plus, Video } from 'lucide-react';
import type {
  AcademyCategory,
  AcademyCourse,
  AcademyLesson,
  AcademyMaterial,
  AcademyModule,
} from '../domain';
import styles from '../academy.module.css';

type LessonDraft = AcademyLesson;
type ModuleDraft = AcademyModule & { lessons: LessonDraft[] };

function hydrateModules(modules: AcademyModule[], lessons: AcademyLesson[]): ModuleDraft[] {
  return [...modules]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((module) => ({
      ...module,
      lessons: lessons
        .filter((lesson) => lesson.moduleId === module.id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((lesson) => ({ ...lesson })),
    }));
}

export function AcademyEditor({
  course,
  categories,
  existingModules = [],
  existingLessons = [],
  existingMaterials = [],
  enabled = false,
}: {
  course?: AcademyCourse | null;
  categories: AcademyCategory[];
  existingModules?: AcademyModule[];
  existingLessons?: AcademyLesson[];
  existingMaterials?: AcademyMaterial[];
  enabled?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? '');
  const [slug, setSlug] = useState(course?.slug ?? '');
  const [summary, setSummary] = useState(course?.summary ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [category, setCategory] = useState(course?.categoryId ?? '');
  const categoryName = categories.find((item) => item.id === category)?.name ?? 'Categoria';
  const [modules, setModules] = useState<ModuleDraft[]>(() =>
    hydrateModules(existingModules, existingLessons),
  );
  const [materials, setMaterials] = useState<AcademyMaterial[]>(() => [...existingMaterials]);
  const [savedId, setSavedId] = useState(course?.id ?? '');
  const [savedVersion, setSavedVersion] = useState(course?.version ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function saveDraft() {
    setSaving(true);
    setMessage('Salvando treinamento...');
    const result = await saveAcademyDraftAction({
      id: savedId || undefined, expectedVersion: savedVersion || undefined,
      title, slug, summary, description, categoryId: category, order: course?.order ?? 0,
      modules, materials,
    });
    setSaving(false);
    setMessage(result.message);
    if (result.ok && result.id && result.version) {
      setSavedId(result.id);
      setSavedVersion(result.version);
      if (!savedId) router.replace(`/admin/academia/${encodeURIComponent(result.id)}`);
      router.refresh();
    }
    return result;
  }
  async function changeStatus(status: 'published' | 'archived') {
    if (!savedId || !savedVersion) return setMessage('Salve o rascunho antes de alterar o status.');
    setSaving(true);
    const result = await setAcademyCourseStatusAction(savedId, savedVersion, status);
    setSaving(false);
    setMessage(result.message);
    if (result.ok) {
      setSavedVersion(result.version ?? savedVersion + 1);
      router.refresh();
    }
  }

  function addModule() {
    setModules((current) => [
      ...current,
      {
        id: `local-${crypto.randomUUID()}`,
        courseId: course?.id ?? '',
        title: '',
        summary: '',
        order: current.length + 1,
        lessons: [],
      },
    ]);
  }
  function addLesson(moduleId: string) {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                {
                  id: `local-${crypto.randomUUID()}`,
                  courseId: course?.id ?? '',
                  moduleId: module.id,
                  title: '',
                  summary: '',
                  order: module.lessons.length + 1,
                  durationSeconds: null,
                  videoFileId: null,
                  status: 'draft',
                },
              ],
            }
          : module,
      ),
    );
  }
  function addMaterial() {
    const firstLesson = modules.flatMap((module) => module.lessons)[0];
    if (!firstLesson) return setMessage('Adicione uma aula antes do material.');
    setMaterials((current) => [...current, {
      id: `local-${crypto.randomUUID()}`, courseId: savedId, lessonId: firstLesson.id,
      title: '', kind: 'pdf', fileId: null, url: null, order: current.length + 1,
    }]);
  }
  function moveModule(index: number, step: number) {
    setModules((current) => {
      const updated = [...current];
      const other = index + step;
      if (other < 0 || other >= updated.length) return current;
      [updated[index], updated[other]] = [updated[other], updated[index]];
      return updated.map((module, position) => ({ ...module, order: position + 1 }));
    });
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Trilha de navegação">
        <Link href="/admin/academia">
          <ArrowLeft size={15} /> Academia NUY
        </Link>
        <span>/</span>
        <span>{course ? 'Editar treinamento' : 'Novo treinamento'}</span>
      </nav>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Editor da Academia</p>
          <h1>{course ? 'Editar treinamento' : 'Novo treinamento'}</h1>
          <p>
            Prepare o conteúdo, salve o rascunho e acompanhe a prévia.
          </p>
        </div>
        <span className={styles.status}>
          {course?.status === 'published' ? 'Publicado' : savedId ? 'Rascunho' : 'Novo rascunho'}
        </span>
      </div>
      <div className={styles.editorGrid}>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2>Identidade do treinamento</h2>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                Título
                <input
                  className={styles.input}
                  name="title"
                  maxLength={255}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Criando conteúdo com propósito"
                />
              </label>
              <label className={styles.field}>
                Slug
                <input
                  className={styles.input}
                  name="slug"
                  maxLength={80}
                  pattern="[a-z0-9-]+"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="criando-com-proposito"
                />
                <span className={styles.fieldHint}>Letras minúsculas, números e hífens.</span>
              </label>
              <label className={styles.field}>
                Categoria
                <select
                  className={styles.select}
                  name="categoryId"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={categories.length === 0}
                >
                  <option value="">
                    {categories.length ? 'Selecione uma categoria' : 'Categorias após migração'}
                  </option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <span className={styles.fieldHint}>Somente categorias registradas no módulo.</span>
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                Resumo
                <textarea
                  className={styles.textarea}
                  name="summary"
                  maxLength={1000}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="O que a creator vai aprender?"
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                Descrição completa
                <textarea
                  className={styles.textarea}
                  name="description"
                  maxLength={6000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Conte a proposta e os resultados do treinamento."
                />
              </label>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Módulos e aulas</h2>
                <p>Organize a ordem antes de publicar.</p>
              </div>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={addModule}
              >
                <Plus size={16} /> Adicionar módulo
              </button>
            </div>
            {modules.length ? (
              <div className={styles.stack}>
                {modules.map((module, index) => (
                  <div className={styles.comment} key={module.id} data-module-id={module.id}>
                    <div className={styles.editorActions}>
                      <button
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        type="button"
                        aria-label="Mover módulo para cima"
                        disabled={index === 0}
                        onClick={() => moveModule(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className={`${styles.button} ${styles.buttonSecondary}`}
                        type="button"
                        aria-label="Mover módulo para baixo"
                        disabled={index === modules.length - 1}
                        onClick={() => moveModule(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                    <label className={styles.field}>
                      Nome do módulo
                      <input
                        className={styles.input}
                        value={module.title}
                        maxLength={255}
                        onChange={(event) =>
                          setModules((current) =>
                            current.map((item) =>
                              item.id === module.id ? { ...item, title: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder={`Módulo ${index + 1}`}
                      />
                    </label>
                    <ul className={styles.list}>
                      {module.lessons.map((lesson, lessonIndex) => (
                        <li className={`${styles.listItem} ${styles.editorLessonItem}`} key={lesson.id} data-lesson-id={lesson.id}>
                          <Video size={16} aria-hidden="true" />
                          <input
                            className={styles.input}
                            aria-label={`Nome da aula ${lessonIndex + 1}`}
                            value={lesson.title}
                            onChange={(event) =>
                              setModules((current) =>
                                current.map((item) =>
                                  item.id === module.id
                                    ? {
                                        ...item,
                                        lessons: item.lessons.map((entry) =>
                                          entry.id === lesson.id
                                            ? { ...entry, title: event.target.value }
                                            : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder={`Aula ${lessonIndex + 1}`}
                          />
                          <input className={styles.input} aria-label={`MP4 homologado da aula ${lessonIndex + 1}`}
                            placeholder="ID do MP4 homologado" value={lesson.videoFileId ?? ''}
                            onChange={(event) => setModules((current) => current.map((entry) =>
                              entry.id === module.id ? { ...entry, lessons: entry.lessons.map((item) =>
                                item.id === lesson.id ? { ...item, videoFileId: event.target.value || null } : item) } : entry))} />
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      type="button"
                      onClick={() => addLesson(module.id)}
                    >
                      <Plus size={15} /> Adicionar aula
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>Adicione um módulo para começar a organizar as aulas.</p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Vídeos, PDFs e materiais</h2>
            <p>
              Os arquivos ficarão no bucket privado <code>academy-media</code> após aprovação.
              Upload e URLs temporárias exigem validação de escopos, limite, byte-range e acesso por
              aula.
            </p>
            {materials.length ? (
              <div className={styles.stack}>
                <h3>Materiais vinculados</h3>
                <ul className={styles.list}>
                  {[...materials]
                    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
                    .map((material) => (
                      <li
                        className={`${styles.listItem} ${styles.editorMaterialItem}`}
                        key={material.id}
                        data-material-id={material.id}
                      >
                        <input className={styles.input} aria-label={`Título do material ${material.order}`}
                          placeholder="Título do material" value={material.title}
                          onChange={(event) => setMaterials((current) => current.map((item) =>
                            item.id === material.id ? { ...item, title: event.target.value } : item))} />
                        <select className={styles.select} aria-label={`Aula do material ${material.order}`}
                          value={material.lessonId ?? ''} onChange={(event) => setMaterials((current) => current.map((item) =>
                            item.id === material.id ? { ...item, lessonId: event.target.value } : item))}>
                          {modules.flatMap((module) => module.lessons).map((lesson) =>
                            <option key={lesson.id} value={lesson.id}>{lesson.title || 'Aula sem título'}</option>)}
                        </select>
                        <select className={styles.select} aria-label={`Tipo do material ${material.order}`}
                          value={material.kind} onChange={(event) => setMaterials((current) => current.map((item) =>
                            item.id === material.id ? { ...item, kind: event.target.value as 'pdf' | 'link', fileId: null, url: null } : item))}>
                          <option value="pdf">PDF</option><option value="link">Link</option>
                        </select>
                        <input className={styles.input} aria-label={`Arquivo ou URL do material ${material.order}`}
                          placeholder={material.kind === 'pdf' ? 'ID do PDF homologado' : 'URL HTTPS'}
                          value={material.kind === 'pdf' ? material.fileId ?? '' : material.url ?? ''}
                          onChange={(event) => setMaterials((current) => current.map((item) =>
                            item.id === material.id ? { ...item,
                              ...(item.kind === 'pdf' ? { fileId: event.target.value || null } :
                                { url: event.target.value || null }) } : item))} />
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            <div className={styles.editorActions}>
              <button className={`${styles.button} ${styles.buttonSecondary}`} type="button"
                onClick={addMaterial}><Plus size={16} /> Adicionar material</button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                disabled
              >
                <Video size={16} /> Enviar MP4
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                disabled
              >
                <FileText size={16} /> Enviar PDF
              </button>
            </div>
          </section>
          <div className={styles.editorActions}>
            <button type="button" className={styles.button} disabled={!enabled || saving}
              onClick={saveDraft}>
              Salvar rascunho
            </button>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={!enabled || saving || !savedId} onClick={() => changeStatus('published')}>
              Publicar
            </button>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={!enabled || saving || !savedId} onClick={() => changeStatus('archived')}>
              Arquivar
            </button>
          </div>
          <p className={styles.muted} role="status">
            {message || (enabled ? 'Salve para confirmar as alterações no servidor.' :
              'Nada foi salvo. A Academia está indisponível neste ambiente.')}
          </p>
        </div>
        <aside className={styles.stack}>
          <section className={styles.panel}>
            <h2>Prévia da creator</h2>
            <div className={styles.miniPreview}>
              <BookOpen size={22} aria-hidden="true" />
              <span className={styles.eyebrow}>{categoryName}</span>
              <strong>{title || 'Título do treinamento'}</strong>
              <p>{summary || 'O resumo aparecerá aqui enquanto você edita.'}</p>
              <span>
                {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} ·{' '}
                {modules.reduce((sum, module) => sum + module.lessons.length, 0)} aulas
              </span>
            </div>
            <p className={styles.muted}>Prévia local, sem publicação e sem acesso de creators.</p>
          </section>
          <section className={styles.panel}>
            <h2>Checklist para publicar</h2>
            <ul>
              <li>Título, resumo e categoria</li>
              <li>Módulos e aulas em ordem</li>
              <li>MP4/PDF privados validados</li>
              <li>Permissões e moderação revisadas</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
