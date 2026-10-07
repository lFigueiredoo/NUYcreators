'use client';
import { useActionState, useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
} from 'lucide-react';
import { loginAction, signupAction } from '../services/actions';
import styles from './auth-access.module.css';

/**
 * Formulário das telas novas de Login e Cadastro.
 *
 * Mesma fiação de antes: exatamente as mesmas server actions
 * (`loginAction`/`signupAction`), os mesmos `name` de campo (name, email,
 * password, terms) e as mesmas validações nativas (required/minLength/
 * maxLength) — o que muda é só a camada visual. As telas legadas continuam
 * com `auth-form.tsx` até a aprovação do CP4.
 */
const actions = { login: loginAction, signup: signupAction };

export function AuthAccessForm({
  mode,
  configured,
}: {
  mode: 'login' | 'signup';
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(actions[mode], { message: '' });
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const helpId = useId();
  const [visible, setVisible] = useState(false);

  const isError = Boolean(state.message) && !state.success;

  return (
    <form action={action} className={styles.form}>
      {!configured && (
        <p className={styles.notice} role="status">
          <Info size={16} aria-hidden="true" />
          {mode === 'signup'
            ? 'O cadastro ainda não está disponível. Estamos preparando o acesso à comunidade.'
            : 'O acesso está temporariamente indisponível. Tente novamente mais tarde.'}
        </p>
      )}

      {mode === 'signup' && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nameId}>
            Nome
          </label>
          <input
            id={nameId}
            className={styles.input}
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </div>
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

      <div className={styles.field}>
        <label className={styles.label} htmlFor={passwordId}>
          Senha
        </label>
        <div className={styles.inputWrap}>
          <input
            id={passwordId}
            className={styles.input}
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            maxLength={256}
            aria-describedby={mode === 'signup' ? helpId : undefined}
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
        {mode === 'signup' && (
          <small id={helpId} className={styles.help}>
            Pelo menos 8 caracteres.
          </small>
        )}
      </div>

      {mode === 'signup' && (
        <label className={styles.terms}>
          <input type="checkbox" name="terms" required />
          <span>
            Declaro que tenho 18 anos ou mais e li e concordo com os{' '}
            <Link href="/termos">Termos de Uso</Link> e a{' '}
            <Link href="/privacidade">Política de Privacidade</Link> do NUY Creators.
          </span>
        </label>
      )}

      <button type="submit" className={styles.submit} disabled={pending || !configured}>
        {pending ? (
          <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
        ) : (
          <>
            {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </>
        )}
      </button>

      <p
        className={`${styles.message} ${isError ? styles.error : styles.success}`}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
      >
        {state.message ? (
          isError ? (
            <CircleAlert size={15} aria-hidden="true" />
          ) : (
            <CircleCheck size={15} aria-hidden="true" />
          )
        ) : null}
        {state.message}
      </p>

      {mode === 'login' && (
        <p className={styles.aside}>
          <Link className={styles.link} href="/recuperar-senha">
            Esqueci minha senha
          </Link>
        </p>
      )}

      <p className={styles.footnote}>
        {mode === 'signup' ? (
          <>
            Já faz parte? <Link href="/login">Entrar</Link>
          </>
        ) : (
          <>
            Ainda não faz parte? <Link href="/cadastro">Criar conta</Link>
          </>
        )}
      </p>
    </form>
  );
}
