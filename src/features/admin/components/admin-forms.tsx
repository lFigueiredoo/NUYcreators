'use client';
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Plus, TriangleAlert, Trash2 } from 'lucide-react';
import {
  catalogPlatforms,
  catalogStatuses,
  catalogStatusView,
  type CatalogStatus,
} from '@/features/workspace/domain/catalog';
import { requirementLabel, requirementTypes } from '@/features/workspace/domain/requirements';
import appStyles from '@/features/workspace/styles/app.module.css';
import { adjustPointsAction } from '@/features/workspace/services/actions';
import {
  campaignSaveAction,
  challengeSaveAction,
  challengeStatusAction,
  rewardSaveAction,
  rewardStatusAction,
  rewardStockAction,
  type FormState,
} from '../services/actions';
import styles from '../styles/admin.module.css';

/**
 * Formulários da administração.
 *
 * Cada um chama UMA server action, que chama UM comando do núcleo. A tela não
 * calcula nível, não decide transição de estado e não inventa vocabulário: ela
 * manda a intenção e mostra a resposta — inclusive quando a resposta é recusa.
 *
 * Os campos são CONTROLADOS. O React 19 limpa formulários não controlados depois
 * de uma action, e um formulário de desafio tem catorze campos: apagar o que a
 * operação digitou porque uma data veio fora de ordem seria devolver trabalho
 * manual como resposta a um erro de digitação.
 */

const EMPTY: FormState = { message: '' };

function ActionMessage({ state, pending }: { state: FormState; pending: boolean }) {
  if (pending)
    return (
      <p
        className={`${appStyles.formStatus} ${appStyles.formBusy}`}
        role="status"
        aria-live="polite"
      >
        <LoaderCircle size={14} className={appStyles.spin} aria-hidden="true" />
        Enviando…
      </p>
    );
  if (!state.message) return null;
  const error = !state.success;
  return (
    <p
      className={`${appStyles.formStatus} ${error ? appStyles.formError : appStyles.formSuccess}`}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      {error ? (
        <CircleAlert size={14} aria-hidden="true" />
      ) : (
        <CircleCheck size={14} aria-hidden="true" />
      )}
      {state.message}
    </p>
  );
}

/**
 * Chave de intenção: uma por formulário aberto, estável enquanto ele está aberto.
 *
 * O valor vive no PRÓPRIO campo oculto, não em estado do React. É o que ele é: um
 * valor de envio. Guardá-lo em estado obrigaria a um ciclo de render só para
 * carimbar um input — e um valor aleatório no HTML do servidor daria descompasso
 * de hidratação. Aqui o campo nasce vazio e é preenchido no navegador, o que o
 * `onSubmit` faz de forma legítima: mexer no DOM, não no estado.
 *
 * SEM `defaultValue` no input, de propósito. Com `defaultValue=""`, o React
 * reaplica o valor padrão quando o atributo do DOM sai do que ele conhece — e o
 * valor carimbado AQUI é justamente isso. Medido: o campo chegava vazio ao
 * servidor na primeira tecla digitada em outro campo do formulário, e a gravação
 * era recusada com "Recarregue a página antes de salvar.".
 *
 * Renasce depois de um sucesso: repetir o envio do MESMO formulário é idempotente,
 * mas criar um segundo item depois de criar o primeiro pede chave nova.
 *
 * A chave sai do Web Crypto, não de `Math.random`: o valor não é credencial, mas
 * uma chave que se repete transformaria "criar o segundo item" em repetição do
 * primeiro — e o portão de dado inventado não aceita valor sorteado no cliente.
 * `getRandomValues` é o caminho de quem serve o app em http (onde `randomUUID`
 * não existe); se nem isso houver, o relógio entra na conta e a chave continua
 * única a cada envio.
 */
function stampKey(node: HTMLInputElement | null) {
  if (!node || node.value) return;
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') {
    node.value = webCrypto.randomUUID();
    return;
  }
  const bytes = new Uint8Array(16);
  webCrypto?.getRandomValues(bytes);
  const drawn = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  node.value = `${Date.now().toString(36)}-${drawn}`;
}

function useIntentionKey(state: FormState): [RefObject<HTMLInputElement | null>, () => void] {
  const field = useRef<HTMLInputElement>(null);
  // Carimba no envio — é o instante em que o valor importa, e o carimbo é no-op
  // enquanto a chave existir, então repetir o clique continua sendo a MESMA
  // intenção (é isso que torna a retentativa idempotente).
  const stamp = () => stampKey(field.current);
  // ...e carimba de novo depois de um sucesso, quando o que o formulário prometeu
  // já foi entregue e o próximo envio é um item novo.
  useEffect(() => {
    if (!state.success) return;
    if (field.current) field.current.value = '';
    stampKey(field.current);
  }, [state]);
  return [field, stamp];
}

/**
 * Campo com rótulo associado de verdade (`label htmlFor`), não um `<span>` ao
 * lado. O id vem por aqui para que rótulo e controle não possam divergir.
 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={appStyles.formRow}>
      <label className={appStyles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className={styles.formHint}>{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

/**
 * Lista fechada que NUNCA perde o valor gravado: se o registro atual tem valor
 * fora da lista (nível desativado, campanha removida, plataforma antiga), ele
 * entra como opção extra. Salvar sem mexer não troca o dado, e a operação vê que
 * aquilo está fora do catálogo de hoje.
 */
function withCurrent(options: Array<{ value: string; label: string }>, current: string) {
  if (current && !options.some((option) => option.value === current))
    return [...options, { value: current, label: `${current} (fora da lista atual)` }];
  return options;
}

function Choice({
  id,
  name,
  value,
  onChange,
  options,
  required,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      className={appStyles.input}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value || '∅'} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/* ============================================================== desafios == */

export type ChallengeFormValues = {
  challengeId: string;
  slug: string;
  name: string;
  description: string;
  platform: string;
  startsAt: string;
  endsAt: string;
  points: string;
  imageFileId: string;
  requiredLevelId: string;
  participantLimit: string;
  campaignId: string;
  productId: string;
  hashtags: string;
  mentions: string;
  version: number | null;
  requirements: Array<{ type: string; required: boolean; configJson: string }>;
};

export type CatalogChoices = {
  levels: Array<{ levelId: string; name: string }>;
  campaigns: Array<{ campaignId: string; name: string }>;
  products: Array<{ productId: string; name: string }>;
};

const BLANK_CHALLENGE: ChallengeFormValues = {
  challengeId: '',
  slug: '',
  name: '',
  description: '',
  platform: '',
  startsAt: '',
  endsAt: '',
  points: '',
  imageFileId: '',
  requiredLevelId: '',
  participantLimit: '',
  campaignId: '',
  productId: '',
  hashtags: '',
  mentions: '',
  version: null,
  requirements: [],
};

export function ChallengeForm({
  values: initial,
  choices,
}: {
  values?: ChallengeFormValues;
  choices: CatalogChoices;
}) {
  const editing = Boolean(initial?.challengeId);
  const [values, setValues] = useState<ChallengeFormValues>(initial ?? BLANK_CHALLENGE);
  const [state, action, pending] = useActionState(challengeSaveAction, EMPTY);

  function set<K extends keyof ChallengeFormValues>(field: K, value: ChallengeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function setRequirement(
    index: number,
    patch: Partial<ChallengeFormValues['requirements'][number]>,
  ) {
    setValues((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, position) =>
        position === index ? { ...requirement, ...patch } : requirement,
      ),
    }));
  }

  const levels = withCurrent(
    choices.levels.map((level) => ({ value: level.levelId, label: level.name })),
    values.requiredLevelId,
  );
  const campaigns = withCurrent(
    choices.campaigns.map((campaign) => ({ value: campaign.campaignId, label: campaign.name })),
    values.campaignId,
  );
  const products = withCurrent(
    choices.products.map((product) => ({ value: product.productId, label: product.name })),
    values.productId,
  );
  const platforms = withCurrent(
    catalogPlatforms.map((platform) => ({ value: platform, label: platform })),
    values.platform,
  );

  return (
    <form action={action} className={appStyles.form}>
      {values.challengeId ? (
        <input type="hidden" name="challengeId" value={values.challengeId} />
      ) : null}
      {values.version !== null ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      <Section title="Identificação">
        <div className={appStyles.formGrid}>
          <Field label="Nome do desafio" hint="É o título que a creator lê na lista e na página.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="name"
                value={values.name}
                maxLength={255}
                required
                onChange={(event) => set('name', event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Identificador (URL)"
            hint={
              editing
                ? 'É a chave pública do desafio e não muda depois de criado.'
                : 'Só letras minúsculas, números e hífen. Ex.: reels-de-verao'
            }
          >
            {(id) => (
              <input
                id={id}
                className={`${appStyles.input} ${editing ? styles.inputReadonly : ''}`}
                name="slug"
                value={values.slug}
                maxLength={60}
                readOnly={editing}
                required
                onChange={(event) => set('slug', event.target.value)}
              />
            )}
          </Field>
          <Field label="Plataforma">
            {(id) => (
              <Choice
                id={id}
                name="platform"
                value={values.platform}
                onChange={(value) => set('platform', value)}
                required
                options={[{ value: '', label: 'Escolha a plataforma' }, ...platforms]}
              />
            )}
          </Field>
          <Field
            label="Imagem (id do arquivo)"
            hint="Id de arquivo do Appwrite Storage. Em branco, o desafio aparece sem imagem."
          >
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="imageFileId"
                value={values.imageFileId}
                maxLength={36}
                onChange={(event) => set('imageFileId', event.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Janela e pontuação">
        <div className={appStyles.formGrid}>
          <Field label="Início" hint="Hora de Brasília. Antes disso o desafio não abre.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="startsAt"
                type="datetime-local"
                value={values.startsAt}
                required
                onChange={(event) => set('startsAt', event.target.value)}
              />
            )}
          </Field>
          <Field label="Término" hint="Hora de Brasília. Depois disso não entram novos envios.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="endsAt"
                type="datetime-local"
                value={values.endsAt}
                required
                onChange={(event) => set('endsAt', event.target.value)}
              />
            )}
          </Field>
          <Field label="Pontos" hint="Creditados uma única vez por envio aprovado.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="points"
                type="number"
                min={0}
                step={1}
                value={values.points}
                required
                onChange={(event) => set('points', event.target.value)}
              />
            )}
          </Field>
          <Field label="Limite de participantes" hint="Em branco = sem limite de vagas.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="participantLimit"
                type="number"
                min={1}
                step={1}
                value={values.participantLimit}
                onChange={(event) => set('participantLimit', event.target.value)}
              />
            )}
          </Field>
          <Field label="Nível exigido" hint="Quem estiver abaixo do nível não consegue participar.">
            {(id) => (
              <Choice
                id={id}
                name="requiredLevelId"
                value={values.requiredLevelId}
                onChange={(value) => set('requiredLevelId', value)}
                options={[{ value: '', label: 'Sem exigência de nível' }, ...levels]}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Contexto">
        <div className={appStyles.formGrid}>
          <Field label="Campanha" hint="Agrupa o desafio numa campanha. Opcional.">
            {(id) => (
              <Choice
                id={id}
                name="campaignId"
                value={values.campaignId}
                onChange={(value) => set('campaignId', value)}
                options={[{ value: '', label: 'Sem campanha' }, ...campaigns]}
              />
            )}
          </Field>
          <Field label="Produto" hint="Produto associado ao desafio. Opcional.">
            {(id) => (
              <Choice
                id={id}
                name="productId"
                value={values.productId}
                onChange={(value) => set('productId', value)}
                options={[{ value: '', label: 'Sem produto' }, ...products]}
              />
            )}
          </Field>
          <Field label="Hashtags" hint="Como a creator deve usar na publicação.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="hashtags"
                value={values.hashtags}
                maxLength={2000}
                onChange={(event) => set('hashtags', event.target.value)}
              />
            )}
          </Field>
          <Field label="Marcações" hint="Perfis que a publicação precisa marcar.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="mentions"
                value={values.mentions}
                maxLength={2000}
                onChange={(event) => set('mentions', event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Descrição" hint="O que a creator precisa saber para participar.">
          {(id) => (
            <textarea
              id={id}
              className={styles.textarea}
              name="description"
              value={values.description}
              maxLength={10000}
              required
              onChange={(event) => set('description', event.target.value)}
            />
          )}
        </Field>
      </Section>

      <Section title="Requisitos">
        <p className={styles.formHint}>
          Requisito é o que a publicação precisa cumprir. A configuração é JSON lido pela página do
          desafio — os tipos oferecidos usam <code>{'{"value":"…"}'}</code>. Chaves que a página não
          conhece ficam guardadas, mas não são exibidas.
        </p>
        <div className={styles.requirementRows}>
          {values.requirements.map((requirement, index) => (
            <div className={styles.requirementRow} key={index}>
              <Choice
                id={`requirement-type-${index}`}
                name="requirementType"
                value={requirement.type}
                onChange={(value) => setRequirement(index, { type: value })}
                options={[
                  { value: '', label: 'Tipo do requisito' },
                  ...requirementTypes.map((type) => ({
                    value: type,
                    label: requirementLabel(type),
                  })),
                  ...(requirement.type && !requirementTypes.includes(requirement.type)
                    ? [{ value: requirement.type, label: `${requirement.type} (fora da lista)` }]
                    : []),
                ]}
              />
              <Choice
                id={`requirement-required-${index}`}
                name="requirementRequired"
                value={requirement.required ? 'true' : 'false'}
                onChange={(value) => setRequirement(index, { required: value === 'true' })}
                options={[
                  { value: 'true', label: 'Obrigatório' },
                  { value: 'false', label: 'Opcional' },
                ]}
              />
              <div className={styles.requirementConfig}>
                <input
                  className={appStyles.input}
                  name="requirementConfig"
                  value={requirement.configJson}
                  placeholder={'{"value":"…"}'}
                  maxLength={10000}
                  aria-label={`Configuração do requisito ${index + 1}`}
                  onChange={(event) => setRequirement(index, { configJson: event.target.value })}
                />
              </div>
              <button
                type="button"
                className={styles.iconOnly}
                aria-label={`Remover requisito ${index + 1}`}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    requirements: current.requirements.filter((_, position) => position !== index),
                  }))
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${appStyles.button} ${appStyles.buttonQuiet}`}
            disabled={values.requirements.length >= 20}
            onClick={() =>
              setValues((current) => ({
                ...current,
                requirements: [
                  ...current.requirements,
                  { type: '', required: true, configJson: '' },
                ],
              }))
            }
          >
            <Plus size={15} aria-hidden="true" />
            Adicionar requisito
          </button>
          <p className={styles.counter}>{values.requirements.length} de 20</p>
        </div>
      </Section>

      <div className={styles.actions}>
        <button
          type="submit"
          name="intent"
          value="draft"
          className={`${appStyles.button} ${appStyles.buttonGhost}`}
          disabled={pending}
        >
          Salvar rascunho
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          {editing ? 'Salvar e publicar' : 'Criar e publicar'}
        </button>
      </div>
      <p className={styles.formHint}>
        Rascunho não aparece para nenhuma creator. Publicado aparece dentro do período informado.
      </p>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/* ===================================================== estados do catálogo == */

/** Publicar e encerrar: as duas transições que mudam o que a creator vê. */
export function CatalogTransitionForm({
  kind,
  id,
  status,
  version,
}: {
  kind: 'challenge' | 'reward';
  id: string;
  status: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(
    kind === 'challenge' ? challengeStatusAction : rewardStatusAction,
    EMPTY,
  );
  const idField = kind === 'challenge' ? 'challengeId' : 'rewardId';
  const noun = kind === 'challenge' ? 'desafio' : 'recompensa';
  const live = status === 'published' || status === 'active';
  return (
    <form action={action} className={appStyles.form}>
      <input type="hidden" name={idField} value={id} />
      <input type="hidden" name="expectedVersion" value={version} />
      <div className={styles.warn}>
        <span className={styles.warnIcon} aria-hidden="true">
          <TriangleAlert size={17} />
        </span>
        <p className={styles.warnText}>
          {live
            ? `Encerrar o ${noun} recusa novas participações e novos envios. Quem já participou continua vendo o ${noun} e o próprio histórico — nada é apagado.`
            : `Publicar deixa o ${noun} visível para as creators dentro do período informado. Se o período já terminou, ele aparece na lista e não aceita envios.`}
        </p>
      </div>
      {live ? (
        <button
          type="submit"
          name="intent"
          value="close"
          className={`${appStyles.button} ${appStyles.buttonGhost}`}
          disabled={pending}
        >
          Encerrar {noun}
        </button>
      ) : (
        <button
          type="submit"
          name="intent"
          value="publish"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          Publicar {noun}
        </button>
      )}
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/* =========================================================== recompensas == */

export type RewardFormValues = {
  rewardId: string;
  name: string;
  type: string;
  description: string;
  pointsCost: string;
  stock: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  imageFileId: string;
  version: number | null;
};

const BLANK_REWARD: RewardFormValues = {
  rewardId: '',
  name: '',
  type: '',
  description: '',
  pointsCost: '',
  stock: '',
  perUserLimit: '',
  startsAt: '',
  endsAt: '',
  imageFileId: '',
  version: null,
};

export function RewardForm({ values: initial }: { values?: RewardFormValues }) {
  const editing = Boolean(initial?.rewardId);
  const [values, setValues] = useState<RewardFormValues>(initial ?? BLANK_REWARD);
  const [state, action, pending] = useActionState(rewardSaveAction, EMPTY);
  // A chave nasce com o formulário aberto e sobrevive a um erro: repetir o clique
  // continua sendo a MESMA intenção. Depois de gravar, a próxima é outra — senão
  // a segunda recompensa seria, de novo, a primeira.
  const [keyField, stampIntent] = useIntentionKey(state);

  function set<K extends keyof RewardFormValues>(field: K, value: RewardFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <form action={action} className={appStyles.form} onSubmit={stampIntent}>
      <input type="hidden" name="key" ref={keyField} />
      {values.rewardId ? <input type="hidden" name="rewardId" value={values.rewardId} /> : null}
      {values.version !== null ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      <Section title="Identificação">
        <div className={appStyles.formGrid}>
          <Field label="Nome da recompensa">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="name"
                value={values.name}
                maxLength={255}
                required
                onChange={(event) => set('name', event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Tipo"
            hint="Texto livre no cadastro. Descreva o formato da entrega (ex.: produto físico, experiência, brinde digital)."
          >
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="type"
                value={values.type}
                maxLength={255}
                required
                onChange={(event) => set('type', event.target.value)}
              />
            )}
          </Field>
          <Field label="Imagem (id do arquivo)" hint="Opcional.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="imageFileId"
                value={values.imageFileId}
                maxLength={36}
                onChange={(event) => set('imageFileId', event.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Valores e disponibilidade">
        <div className={appStyles.formGrid}>
          <Field label="Custo em pontos" hint="Debitado do saldo disponível no resgate.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="pointsCost"
                type="number"
                min={0}
                step={1}
                value={values.pointsCost}
                required
                onChange={(event) => set('pointsCost', event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Estoque"
            hint={
              editing
                ? 'Estoque de recompensa já criada muda na tela de detalhe, com motivo e registro.'
                : 'Unidades disponíveis. Cada resgate derruba uma.'
            }
          >
            {(id) => (
              <input
                id={id}
                className={`${appStyles.input} ${editing ? styles.inputReadonly : ''}`}
                name="stock"
                type="number"
                min={0}
                step={1}
                value={values.stock}
                required
                readOnly={editing}
                onChange={(event) => set('stock', event.target.value)}
              />
            )}
          </Field>
          <Field label="Limite por creator">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="perUserLimit"
                type="number"
                min={1}
                step={1}
                value={values.perUserLimit}
                required
                onChange={(event) => set('perUserLimit', event.target.value)}
              />
            )}
          </Field>
          <Field label="Início" hint="Hora de Brasília.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="startsAt"
                type="datetime-local"
                value={values.startsAt}
                required
                onChange={(event) => set('startsAt', event.target.value)}
              />
            )}
          </Field>
          <Field label="Término" hint="Hora de Brasília.">
            {(id) => (
              <input
                id={id}
                className={appStyles.input}
                name="endsAt"
                type="datetime-local"
                value={values.endsAt}
                required
                onChange={(event) => set('endsAt', event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Descrição" hint="O que a creator recebe e como recebe.">
          {(id) => (
            <textarea
              id={id}
              className={styles.textarea}
              name="description"
              value={values.description}
              maxLength={10000}
              required
              onChange={(event) => set('description', event.target.value)}
            />
          )}
        </Field>
      </Section>

      <div className={styles.actions}>
        <button
          type="submit"
          name="intent"
          value="draft"
          className={`${appStyles.button} ${appStyles.buttonGhost}`}
          disabled={pending}
        >
          Salvar rascunho
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          {editing ? 'Salvar e ativar' : 'Criar e ativar'}
        </button>
      </div>
      <p className={styles.formHint}>
        Rascunho não aparece no catálogo das creators. Publicado aparece dentro do período — e
        desativar depois mantém válidos os resgates já feitos.
      </p>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/** Ajuste de estoque: motivo obrigatório, valor absoluto, registro na auditoria. */
export function StockForm({
  rewardId,
  stock,
  version,
}: {
  rewardId: string;
  stock: number;
  version: number;
}) {
  const [state, action, pending] = useActionState(rewardStockAction, EMPTY);
  const [target, setTarget] = useState(String(stock));
  const [motive, setMotive] = useState('');
  return (
    <form action={action} className={appStyles.form}>
      <input type="hidden" name="rewardId" value={rewardId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <div className={appStyles.formGrid}>
        <Field label="Estoque" hint={`Valor atual: ${stock}. Informe o total desejado.`}>
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="stock"
              type="number"
              min={0}
              step={1}
              value={target}
              required
              onChange={(event) => setTarget(event.target.value)}
            />
          )}
        </Field>
        <Field label="Motivo do ajuste" hint="Fica na auditoria com quem ajustou e quando.">
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="reason"
              value={motive}
              minLength={3}
              maxLength={2000}
              required
              onChange={(event) => setMotive(event.target.value)}
            />
          )}
        </Field>
      </div>
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          Ajustar estoque
        </button>
      </div>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/* ============================================================= campanhas == */

export type CampaignFormValues = {
  campaignId: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: CatalogStatus;
};

const BLANK_CAMPAIGN: CampaignFormValues = {
  campaignId: '',
  name: '',
  description: '',
  startsAt: '',
  endsAt: '',
  status: 'draft',
};

export function CampaignForm({ values: initial }: { values?: CampaignFormValues }) {
  const editing = Boolean(initial?.campaignId);
  const [values, setValues] = useState<CampaignFormValues>(initial ?? BLANK_CAMPAIGN);
  const [state, action, pending] = useActionState(campaignSaveAction, EMPTY);
  const [keyField, stampIntent] = useIntentionKey(state);

  function set<K extends keyof CampaignFormValues>(field: K, value: CampaignFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <form action={action} className={appStyles.form} onSubmit={stampIntent}>
      <input type="hidden" name="key" ref={keyField} />
      {values.campaignId ? (
        <input type="hidden" name="campaignId" value={values.campaignId} />
      ) : null}
      <div className={appStyles.formGrid}>
        <Field label="Nome da campanha">
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="name"
              value={values.name}
              maxLength={255}
              required
              onChange={(event) => set('name', event.target.value)}
            />
          )}
        </Field>
        <Field
          label="Estado"
          hint="Campanha não aparece para a creator em estado nenhum: é agrupamento interno."
        >
          {(id) => (
            <Choice
              id={id}
              name="status"
              value={values.status}
              onChange={(value) => set('status', value as CatalogStatus)}
              options={catalogStatuses.map((status) => ({
                value: status,
                label: catalogStatusView[status].label,
              }))}
            />
          )}
        </Field>
        <Field label="Início" hint="Hora de Brasília.">
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="startsAt"
              type="datetime-local"
              value={values.startsAt}
              required
              onChange={(event) => set('startsAt', event.target.value)}
            />
          )}
        </Field>
        <Field label="Término" hint="Hora de Brasília.">
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="endsAt"
              type="datetime-local"
              value={values.endsAt}
              required
              onChange={(event) => set('endsAt', event.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Descrição" hint="Para que serve a campanha, do ponto de vista de quem opera.">
        {(id) => (
          <textarea
            id={id}
            className={styles.textarea}
            name="description"
            value={values.description}
            maxLength={10000}
            required
            onChange={(event) => set('description', event.target.value)}
          />
        )}
      </Field>
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          {editing ? 'Salvar campanha' : 'Criar campanha'}
        </button>
        <ActionMessage state={state} pending={pending} />
      </div>
    </form>
  );
}

/* ======================================================= ajuste de pontos == */

/**
 * Ajuste de pontos: motivo E referência obrigatórios.
 *
 * Não é um campo de saldo. O valor entra como lançamento no extrato, com a
 * referência que a equipe usar para rastrear o caso (ticket, protocolo), e o
 * núcleo recusa débito que deixaria o saldo negativo. Ajuste não conta para
 * nível nem para ranking — quem move o saldo gastável não move a posição.
 */
export function PointsAdjustForm({ userId, balance }: { userId: string; balance: number }) {
  const [state, action, pending] = useActionState(adjustPointsAction, EMPTY);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [keyField, stampIntent] = useIntentionKey(state);

  return (
    <form action={action} className={appStyles.form} onSubmit={stampIntent}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="key" ref={keyField} />
      <div className={appStyles.formGrid}>
        <Field label="Quantidade" hint={`Saldo disponível hoje: ${balance}. Negativo debita.`}>
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="amount"
              type="number"
              step={1}
              value={amount}
              required
              onChange={(event) => setAmount(event.target.value)}
            />
          )}
        </Field>
        <Field label="Referência" hint="Onde este ajuste foi decidido (ticket, protocolo).">
          {(id) => (
            <input
              id={id}
              className={appStyles.input}
              name="referenceId"
              value={reference}
              maxLength={120}
              required
              onChange={(event) => setReference(event.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Motivo" hint="Aparece no extrato da creator e na auditoria.">
        {(id) => (
          <input
            id={id}
            className={appStyles.input}
            name="reason"
            value={reason}
            minLength={3}
            maxLength={2000}
            required
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </Field>
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          disabled={pending}
        >
          Aplicar ajuste
        </button>
        <p className={styles.counter}>Não altera nível nem ranking — mexe só no saldo gastável.</p>
      </div>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}
