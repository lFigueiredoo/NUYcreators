'use client';
import { useActionState, useId, useRef } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import {
  joinChallengeAction,
  moderateSubmissionAction,
  notificationReadAction,
  notificationsReadAllAction,
  redeemRewardAction,
  submitContentAction,
  updateProfileAction,
  type FormState,
} from '../services/actions';
import styles from '../styles/app.module.css';

/**
 * Formulários do núcleo operacional.
 *
 * Cada um chama UMA server action, que por sua vez chama UM comando do núcleo.
 * Nada aqui calcula saldo, decide moderação ou inventa estado: a tela envia a
 * intenção e mostra a resposta do servidor — inclusive quando a resposta é uma
 * recusa de negócio ("sem estoque", "vagas preenchidas", "já resgatado").
 *
 * Toda escrita é mediada pelo servidor com a chave de operação: medido em
 * staging que a sessão da usuária leva 401 em `createRow` mesmo com
 * `rowSecurity`. Por isso estes formulários só aparecem quando a operação está
 * configurada — sem ela, as telas informam o estado real em vez de simular.
 */
const EMPTY: FormState = { message: '' };

function ActionMessage({ state, pending }: { state: FormState; pending: boolean }) {
  if (pending)
    return (
      <p className={`${styles.formStatus} ${styles.formBusy}`} role="status" aria-live="polite">
        <LoaderCircle size={14} className={styles.spin} aria-hidden="true" />
        Enviando…
      </p>
    );
  if (!state.message) return null;
  const error = !state.success;
  return (
    <p
      className={`${styles.formStatus} ${error ? styles.formError : styles.formSuccess}`}
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

/** Entrar no desafio. Idempotente no servidor: repetir devolve a mesma entrada. */
export function JoinChallengeForm({ challengeId }: { challengeId: string }) {
  const [state, action, pending] = useActionState(joinChallengeAction, EMPTY);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <button
        type="submit"
        className={`${styles.button} ${styles.buttonPrimary}`}
        disabled={pending}
      >
        Participar do desafio
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/** Enviar conteúdo: o link é canonizado e o fingerprint bloqueia repetição. */
export function SubmitContentForm({ challengeId }: { challengeId: string }) {
  const [state, action, pending] = useActionState(submitContentAction, EMPTY);
  const urlId = useId();
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <label className={styles.fieldLabel} htmlFor={urlId}>
        Link da publicação
      </label>
      <input
        id={urlId}
        className={styles.input}
        name="url"
        type="url"
        inputMode="url"
        placeholder="https://www.instagram.com/p/..."
        maxLength={2048}
        required
      />
      <p className={styles.statHint}>
        O link entra na análise da equipe NUY. Um conteúdo por vez por desafio.
      </p>
      <button
        type="submit"
        className={`${styles.button} ${styles.buttonPrimary}`}
        disabled={pending}
      >
        Enviar para análise
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/**
 * Resgatar recompensa.
 *
 * A chave de idempotência nasce da INTENÇÃO, não do clique: ela é criada na
 * primeira tentativa e reaproveitada se o botão for apertado de novo enquanto a
 * resposta não chega — duas requisições da mesma intenção resgatam uma vez só.
 * Depois de um resgate concluído, a próxima tentativa é uma intenção nova.
 */
export function RedeemRewardForm({
  rewardId,
  expectedCost,
}: {
  rewardId: string;
  expectedCost: number;
}) {
  const [state, action, pending] = useActionState(redeemRewardAction, EMPTY);
  const key = useRef('');
  const field = useRef<HTMLInputElement>(null);
  return (
    <form
      action={action}
      className={styles.form}
      onSubmit={() => {
        if (!key.current || state.success) key.current = crypto.randomUUID();
        if (field.current) field.current.value = key.current;
      }}
    >
      <input type="hidden" name="rewardId" value={rewardId} />
      <input type="hidden" name="expectedCost" value={String(expectedCost)} />
      {/* Preenchido no clique, no cliente: o valor do servidor é vazio e estável. */}
      <input type="hidden" name="idempotencyKey" ref={field} defaultValue="" />
      <button
        type="submit"
        className={`${styles.button} ${styles.buttonPrimary}`}
        disabled={pending}
      >
        Resgatar
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/** Leitura de um aviso: quem grava `readAt` é o servidor, na linha da própria dona. */
export function NotificationReadForm({
  notificationId,
  read,
}: {
  notificationId: string;
  read: boolean;
}) {
  const [state, action, pending] = useActionState(notificationReadAction, EMPTY);
  return (
    <form action={action} className={styles.formInline}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <input type="hidden" name="read" value={read ? 'true' : 'false'} />
      <button type="submit" className={`${styles.button} ${styles.buttonQuiet}`} disabled={pending}>
        {read ? 'Marcar como não lida' : 'Marcar como lida'}
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/** Marca a central inteira como lida — em uma passada, no servidor. */
export function NotificationsReadAllForm({ unread }: { unread: number }) {
  const [state, action, pending] = useActionState(notificationsReadAllAction, EMPTY);
  if (unread <= 0) return null;
  return (
    <form action={action} className={styles.formInline}>
      <button type="submit" className={`${styles.button} ${styles.buttonGhost}`} disabled={pending}>
        Marcar todas como lidas
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/**
 * Edição do perfil — os mesmos campos do cadastro, já preenchidos.
 *
 * Só os campos editáveis são enviados; saldo, papel e status de conta não
 * existem neste formulário e não são copiados de lugar nenhum.
 */
export function ProfileEditForm({
  initial,
  states,
  niches,
  creatorTypes,
}: {
  initial: {
    name: string;
    phone: string;
    city: string;
    state: string;
    birthDate: string;
    niche: string;
    creatorType: string;
    publicProfile: boolean;
  };
  states: string[];
  niches: string[];
  creatorTypes: string[];
}) {
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY);
  const nameId = useId();
  const phoneId = useId();
  const cityId = useId();
  const stateId = useId();
  const birthId = useId();
  const nicheId = useId();
  const creatorId = useId();
  const publicId = useId();
  return (
    <form action={action} className={styles.form}>
      <div className={styles.formGrid}>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={nameId}>
            Nome
          </label>
          <input
            id={nameId}
            className={styles.input}
            name="name"
            defaultValue={initial.name}
            required
            minLength={2}
            maxLength={100}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={phoneId}>
            Telefone
          </label>
          <input
            id={phoneId}
            className={styles.input}
            name="phone"
            defaultValue={initial.phone}
            inputMode="tel"
            required
            maxLength={20}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={cityId}>
            Cidade
          </label>
          <input
            id={cityId}
            className={styles.input}
            name="city"
            defaultValue={initial.city}
            required
            minLength={2}
            maxLength={100}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={stateId}>
            UF
          </label>
          <select id={stateId} className={styles.input} name="state" defaultValue={initial.state}>
            {states.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={birthId}>
            Data de nascimento
          </label>
          <input
            id={birthId}
            className={styles.input}
            name="birthDate"
            type="date"
            defaultValue={initial.birthDate}
            required
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={nicheId}>
            Seu universo
          </label>
          <select id={nicheId} className={styles.input} name="niche" defaultValue={initial.niche}>
            {niches.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <label className={styles.fieldLabel} htmlFor={creatorId}>
            Como você cria
          </label>
          <select
            id={creatorId}
            className={styles.input}
            name="creatorType"
            defaultValue={initial.creatorType}
          >
            {creatorTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formCheck}>
        <input
          id={publicId}
          className={styles.checkbox}
          name="publicProfile"
          type="checkbox"
          defaultChecked={initial.publicProfile}
        />
        <label htmlFor={publicId} className={styles.checkLabel}>
          Exibir meu nome em áreas públicas, como o ranking. Só o nome — nunca e-mail, telefone ou
          endereço.
        </label>
      </div>

      <button
        type="submit"
        className={`${styles.button} ${styles.buttonPrimary}`}
        disabled={pending}
      >
        Salvar alterações
      </button>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}

/**
 * Decisão de moderação.
 *
 * `expectedRevision` viaja no formulário: a equipe decide sobre a revisão que
 * VIU. Se a criadora reenviou no meio, o servidor recusa em vez de aprovar
 * conteúdo que ninguém leu.
 */
export function ModerationDecisionForm({
  submissionId,
  expectedRevision,
}: {
  submissionId: string;
  expectedRevision: number;
}) {
  const [state, action, pending] = useActionState(moderateSubmissionAction, EMPTY);
  const reasonId = useId();
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="expectedRevision" value={String(expectedRevision)} />
      <label className={styles.fieldLabel} htmlFor={reasonId}>
        Motivo (obrigatório para recusar ou pedir revisão)
      </label>
      <input
        id={reasonId}
        className={styles.input}
        name="reason"
        maxLength={2000}
        placeholder="Ex.: ajuste a legenda e reenvie."
      />
      <div className={styles.formActions}>
        <button
          type="submit"
          name="decision"
          value="approve"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={pending}
        >
          Aprovar
        </button>
        <button
          type="submit"
          name="decision"
          value="request_revision"
          className={`${styles.button} ${styles.buttonGhost}`}
          disabled={pending}
        >
          Pedir revisão
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          className={`${styles.button} ${styles.buttonQuiet}`}
          disabled={pending}
        >
          Recusar
        </button>
      </div>
      <ActionMessage state={state} pending={pending} />
    </form>
  );
}
