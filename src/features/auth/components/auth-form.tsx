'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  loginAction,
  signupAction,
  recoveryAction,
  resetAction,
  verifyAction,
} from '../services/actions';
type Mode = 'login' | 'signup' | 'recovery' | 'reset' | 'verify';
const actions = {
  login: loginAction,
  signup: signupAction,
  recovery: recoveryAction,
  reset: resetAction,
  verify: verifyAction,
};
export function AuthForm({
  mode,
  configured,
  token,
}: {
  mode: Mode;
  configured: boolean;
  token?: { userId: string; secret: string };
}) {
  const [state, action, pending] = useActionState(actions[mode], { message: '' });
  const labels = {
    login: 'Entrar',
    signup: 'Criar minha conta',
    recovery: 'Enviar instruções',
    reset: 'Redefinir senha',
    verify: 'Confirmar email',
  };
  return (
    <form action={action} className="form-stack">
      {!configured && (
        <p className="service-notice" role="status">
          Estamos preparando a comunidade.{' '}
          {mode === 'signup'
            ? 'O cadastro aguarda a conexão segura e as políticas definitivas de participação.'
            : 'A autenticação ainda não está conectada ao Appwrite.'}
        </p>
      )}
      {token && (
        <>
          <input type="hidden" name="userId" value={token.userId} />
          <input type="hidden" name="secret" value={token.secret} />
        </>
      )}
      {mode === 'signup' && (
        <label>
          Seu nome
          <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
        </label>
      )}
      {['signup', 'login', 'recovery'].includes(mode) && (
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="voce@exemplo.com"
          />
        </label>
      )}
      {['signup', 'login', 'reset'].includes(mode) && (
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            maxLength={256}
          />
          <small>Pelo menos 8 caracteres.</small>
        </label>
      )}
      {mode === 'signup' && (
        <label className="checkbox-label">
          <input type="checkbox" name="terms" required />{' '}
          <span>
            Li os <Link href="/termos">termos</Link> e o{' '}
            <Link href="/privacidade">aviso de privacidade</Link>. O cadastro será liberado após a
            publicação das políticas definitivas.
          </span>
        </label>
      )}
      <Button type="submit" disabled={pending || !configured}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <>
            {labels[mode]}
            <ArrowRight size={17} />
          </>
        )}
      </Button>
      <p aria-live="polite" className={state.success ? 'form-success' : 'form-message'}>
        {state.message}
      </p>
      {mode === 'login' && (
        <Link className="text-link" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
      )}
      <p className="auth-footnote">
        {mode === 'signup' ? (
          <>
            Já faz parte? <Link href="/login">Entre na comunidade</Link>
          </>
        ) : (
          <>
            Sua história começa aqui. <Link href="/cadastro">Faça parte</Link>
          </>
        )}
      </p>
    </form>
  );
}
