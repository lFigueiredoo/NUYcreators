'use client';
import { useActionState, useId, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import { recoveryAction, resetAction, verifyAction } from '../services/actions';
import { AuthFormShell } from './auth-form-shell';
import styles from './auth-access.module.css';

/**
 * Telas de recuperação, redefinição e verificação na identidade da Proposta C.
 *
 * Mesma fiação de sempre — exatamente as mesmas server actions
 * (`recoveryAction`, `resetAction`, `verifyAction`), os mesmos `name` de campo
 * (`email`, `password`, `userId`, `secret`) e as mesmas validações nativas. A
 * camada nova é visual: título e texto de apoio trocam quando a ação conclui
 * (estado de enviado / de senha atualizada), reusando a casca e o painel de
 * `/login`.
 *
 * Nada de funcionalidade inventada: cada ação secundária aponta para uma rota
 * que já existe (`/login`, `/recuperar-senha`, `/onboarding`).
 */

/** Aviso neutro (serviço indisponível, estado que precisa do link do e-mail). */
function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      <Info size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

/** Mensagem da ação: erro com `role="alert"`, sucesso com `role="status"`. */
function Status({ message, success }: { message: string; success?: boolean }) {
  const isError = Boolean(message) && !success;
  return (
    <p
      className={`${styles.message} ${isError ? styles.error : styles.success}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {message ? (
        isError ? (
          <CircleAlert size={15} aria-hidden="true" />
        ) : (
          <CircleCheck size={15} aria-hidden="true" />
        )
      ) : null}
      {message}
    </p>
  );
}

/** CTA principal: o mesmo botão navy das telas de acesso. */
function Submit({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button type="submit" className={styles.submit} disabled={disabled}>
      {pending ? (
        <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
      ) : (
        <>
          {children}
          <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
        </>
      )}
    </button>
  );
}

/**
 * 01 — Recuperação de senha.
 *
 * Antes do envio: e-mail + "Enviar instruções". Depois: o estado de enviado
 * manda na tela — ícone, "Confira seu e-mail." e a única ação que existe
 * (`/login`). A resposta da action é uniforme (anti-enumeração) e continua
 * uniforme aqui: o texto aprovado não confirma nem nega a existência da conta.
 */
export function RecoveryScreen({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(recoveryAction, { message: '' });
  const emailId = useId();

  if (state.success)
    return (
      <AuthFormShell
        title={
          <>
            Confira <em>seu e-mail.</em>
          </>
        }
        lead="Enviamos as instruções de recuperação para o endereço informado."
      >
        <div className={styles.done}>
          <span className={styles.doneIcon} aria-hidden="true">
            <MailCheck size={22} />
          </span>
          <Link className={`${styles.ghost} ${styles.doneAction}`} href="/login">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar para entrar
          </Link>
        </div>
      </AuthFormShell>
    );

  return (
    <AuthFormShell
      title={
        <>
          Vamos recuperar <em>seu acesso.</em>
        </>
      }
      lead="Informe seu e-mail e enviaremos as instruções para você."
    >
      <form action={action} className={styles.form}>
        {!configured && (
          <Notice>O acesso está temporariamente indisponível. Tente novamente mais tarde.</Notice>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor={emailId}>
            E-mail
          </label>
          <input
            id={emailId}
            className={styles.input}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="voce@exemplo.com"
          />
        </div>

        <Submit pending={pending} disabled={pending || !configured}>
          Enviar instruções
        </Submit>

        <Status message={state.message} success={state.success} />

        <p className={styles.aside}>
          <Link className={styles.link} href="/login">
            Voltar para entrar
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}

/**
 * 02 — Redefinição de senha.
 *
 * Um campo só ("Nova senha"): o formulário atual não tem confirmação de senha
 * e criar uma seria mudar a validação — fora da camada visual. Sem os tokens
 * do link (`userId`/`secret`) o formulário não teria o que enviar: a tela
 * mostra o estado honesto e as duas saídas que existem de verdade (pedir novo
 * link ou voltar para entrar).
 */
export function ResetScreen({
  configured,
  token,
}: {
  configured: boolean;
  token: { userId: string; secret: string };
}) {
  const [state, action, pending] = useActionState(resetAction, { message: '' });
  const passwordId = useId();
  const helpId = useId();
  const [visible, setVisible] = useState(false);
  const hasToken = Boolean(token.userId && token.secret);

  if (state.success)
    return (
      <AuthFormShell
        title={
          <>
            Senha <em>atualizada.</em>
          </>
        }
        lead="Sua nova senha já está valendo. Você já pode entrar."
      >
        <div className={styles.done}>
          <span className={styles.doneIcon} aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <Link className={`${styles.submit} ${styles.doneAction}`} href="/login">
            Entrar
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </Link>
        </div>
      </AuthFormShell>
    );

  if (!hasToken)
    return (
      <AuthFormShell
        title={
          <>
            Crie uma <em>nova senha.</em>
          </>
        }
        lead="Abra o link que enviamos para o seu e-mail para criar uma nova senha."
      >
        <div className={styles.form}>
          <Notice>Este endereço precisa do link enviado por e-mail para funcionar.</Notice>
          <Link className={styles.submit} href="/recuperar-senha">
            Solicitar novo link
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </Link>
          <p className={styles.aside}>
            <Link className={styles.link} href="/login">
              Voltar para entrar
            </Link>
          </p>
        </div>
      </AuthFormShell>
    );

  return (
    <AuthFormShell
      title={
        <>
          Crie uma <em>nova senha.</em>
        </>
      }
      lead="Defina a nova senha da sua conta NUY Creators."
    >
      <form action={action} className={styles.form}>
        {!configured && (
          <Notice>O acesso está temporariamente indisponível. Tente novamente mais tarde.</Notice>
        )}

        <input type="hidden" name="userId" value={token.userId} />
        <input type="hidden" name="secret" value={token.secret} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor={passwordId}>
            Nova senha
          </label>
          <div className={styles.inputWrap}>
            <input
              id={passwordId}
              className={styles.input}
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={256}
              aria-describedby={helpId}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={visible}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          <small id={helpId} className={styles.help}>
            Pelo menos 8 caracteres.
          </small>
        </div>

        <Submit pending={pending} disabled={pending || !configured}>
          Salvar nova senha
        </Submit>

        <Status message={state.message} success={state.success} />

        <p className={styles.aside}>
          <Link className={styles.link} href="/recuperar-senha">
            Solicitar um novo link
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}

/**
 * 03 — Verificação de e-mail.
 *
 * Com os tokens do link, a ação real continua sendo um clique explícito
 * ("Confirmar meu e-mail" → `verifyAction`): confirmar no carregamento da
 * página seria mudar a funcionalidade. Sem tokens, não há o que confirmar —
 * a tela mostra o texto aprovado e a saída que existe (`/login`); o reenvio do
 * e-mail exige sessão e vive no onboarding, onde já funcionava.
 */
export function VerifyScreen({
  configured,
  token,
}: {
  configured: boolean;
  token: { userId: string; secret: string };
}) {
  const [state, action, pending] = useActionState(verifyAction, { message: '' });
  const hasToken = Boolean(token.userId && token.secret);

  if (state.success)
    return (
      <AuthFormShell
        title={
          <>
            E-mail <em>confirmado.</em>
          </>
        }
        lead="Seu endereço foi verificado. O próximo passo é completar o seu perfil."
      >
        <div className={styles.done}>
          <span className={styles.doneIcon} aria-hidden="true">
            <CircleCheck size={22} />
          </span>
          <Link className={`${styles.submit} ${styles.doneAction}`} href="/onboarding">
            Continuar para o meu perfil
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </Link>
        </div>
      </AuthFormShell>
    );

  return (
    <AuthFormShell
      title={
        <>
          Só falta <em>confirmar seu e-mail.</em>
        </>
      }
      lead="Enviamos um link de verificação para o seu endereço."
    >
      {hasToken ? (
        <form action={action} className={styles.form}>
          {!configured && (
            <Notice>O acesso está temporariamente indisponível. Tente novamente mais tarde.</Notice>
          )}

          <input type="hidden" name="userId" value={token.userId} />
          <input type="hidden" name="secret" value={token.secret} />

          <Submit pending={pending} disabled={pending || !configured}>
            Confirmar meu e-mail
          </Submit>

          <Status message={state.message} success={state.success} />

          <p className={styles.aside}>
            <Link className={styles.link} href="/login">
              Ir para o login
            </Link>
          </p>
        </form>
      ) : (
        <div className={styles.form}>
          <Notice>Abra o link que enviamos para o seu e-mail para confirmar o endereço.</Notice>
          <Link className={styles.submit} href="/login">
            Ir para o login
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </Link>
        </div>
      )}
    </AuthFormShell>
  );
}
