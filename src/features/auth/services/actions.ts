'use server';
import { ID, Functions } from 'node-appwrite';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  authConfigured,
  registrationConfigured,
  createAccount,
  createSessionAccount,
  currentUser,
  readOwnProfile,
  SESSION_COOKIE,
  sessionClient,
} from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { sessionRoles } from '@/lib/security/authorization';
import type { AdminRole } from '@/lib/security/permissions';
import {
  loginSchema,
  recoverySchema,
  resetSchema,
  signupSchema,
  verificationSchema,
} from '../schemas/auth';
import { onboardingSchema } from '@/features/profiles/schemas/onboarding';
import { CURRENT_LEGAL_CONSENT_VERSION } from '@/features/legal/versions';
import { signedInRoute } from './onboarding-gate';
import { failureMessage, refusalMessage } from './onboarding-refusal';
import {
  definitiveActionTokenError,
  parseActionToken,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_PATH,
  VERIFICATION_TOKEN_COOKIE,
  VERIFICATION_TOKEN_PATH,
  type ActionToken,
} from './action-token';

export type FormState = { message: string; success?: boolean };
async function allowedRequest() {
  try {
    const origin = (await headers()).get('origin');
    return origin === new URL(getEnvironment().APP_URL).origin;
  } catch (error) {
    console.error('Não foi possível validar a origem da ação de autenticação:', error);
    return false;
  }
}
async function saveSession(email: string, password: string) {
  const session = await createSessionAccount().createEmailPasswordSession({ email, password });
  if (!session.secret) throw new Error('Session secret unavailable');
  (await cookies()).set(SESSION_COOKIE, session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expire),
  });
  return session;
}
export async function loginAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!(await allowedRequest()) || !authConfigured())
    return { message: 'A autenticação ainda não está disponível.' };
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: 'Confira seu email e sua senha (mínimo de 8 caracteres).' };
  let session;
  try {
    session = await saveSession(parsed.data.email, parsed.data.password);
  } catch {
    return {
      message: 'Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.',
    };
  }
  // Prioridade do destino: sessão → membership confirmada em `nuy-admins` →
  // `/admin`; fora dela, a fonte de verdade do onboarding (o perfil privado que
  // a função `complete-onboarding` grava). Operador administrativo não passa
  // pelo onboarding de criadora. Nenhuma das duas leituras derruba o login já
  // feito: sem confirmação, o destino conservador é o onboarding, que é
  // resumível e regrava por upsert.
  let roles: AdminRole[] = [];
  try {
    roles = await sessionRoles(session.secret, session.userId);
  } catch {
    /* indiferente: sem papéis confirmados, o destino é o de criadora */
  }
  // Operador confirmado não tem perfil de criadora a consultar.
  let profile: { onboardingCompletedAt?: unknown } | null = null;
  if (!roles.length) {
    try {
      profile = await readOwnProfile(session.secret, session.userId);
    } catch {
      /* indiferente: `null` manda para o onboarding */
    }
  }
  redirect(signedInRoute(profile, roles));
}
export async function signupAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!(await allowedRequest()) || !registrationConfigured())
    return {
      message: 'O cadastro aguarda a conexão segura e a aprovação das políticas de participação.',
    };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Preencha os campos e aceite os termos para continuar.' };
  try {
    await createAccount().create({
      userId: ID.unique(),
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
    });
    const session = await saveSession(parsed.data.email, parsed.data.password);
    const account = createAccount(session.secret);
    await account.updatePrefs({
      prefs: {
        acceptedTermsVersion: CURRENT_LEGAL_CONSENT_VERSION,
        termsConsentAt: new Date().toISOString(),
      },
    });
    await account.createVerification({
      url: `${getEnvironment().APP_URL}/verificar-email`,
    });
  } catch {
    return {
      message:
        'Não foi possível concluir. Se já criou sua conta, entre para reenviar a verificação.',
    };
  }
  redirect('/verificar-email');
}
export async function recoveryAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!(await allowedRequest()) || !authConfigured())
    return { message: 'A recuperação ainda não está disponível.' };
  const parsed = recoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Informe um email válido.' };
  try {
    await createAccount().createRecovery({
      email: parsed.data.email,
      url: `${getEnvironment().APP_URL}/redefinir-senha`,
    });
  } catch {
    /* Uniform response prevents account enumeration. */
  }
  return {
    success: true,
    message: 'Se houver uma conta com esse email, você receberá as instruções de recuperação.',
  };
}
export async function resetAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!(await allowedRequest()) || !authConfigured())
    return { message: 'A recuperação ainda não está disponível.' };
  const store = await cookies();
  const token = parseActionToken(store.get(RESET_TOKEN_COOKIE)?.value);
  if (!token) {
    store.delete({ name: RESET_TOKEN_COOKIE, path: RESET_TOKEN_PATH });
    return { message: 'Link inválido ou expirado. Solicite outro email.' };
  }
  const parsed = resetSchema.safeParse({
    userId: token.userId,
    secret: token.secret,
    password: form.get('password'),
  });
  if (!parsed.success) return { message: 'Use uma senha com pelo menos 8 caracteres.' };
  try {
    await createAccount().updateRecovery(parsed.data);
  } catch (error) {
    if (definitiveActionTokenError(error)) {
      store.delete({ name: RESET_TOKEN_COOKIE, path: RESET_TOKEN_PATH });
      return { message: 'Link inválido ou expirado. Solicite outro email.' };
    }
    return {
      message: 'Não foi possível redefinir a senha agora. Tente novamente em instantes.',
    };
  }
  store.delete({ name: RESET_TOKEN_COOKIE, path: RESET_TOKEN_PATH });
  return { success: true, message: 'Senha redefinida. Você já pode entrar.' };
}
export async function verifyAction(_previous: FormState, _form: FormData): Promise<FormState> {
  void _previous;
  void _form;
  if (!(await allowedRequest()) || !authConfigured())
    return { message: 'A verificação ainda não está disponível.' };
  const store = await cookies();
  const token = parseActionToken(store.get(VERIFICATION_TOKEN_COOKIE)?.value);
  const result = await verifyEmailToken(token);
  if (result.discardToken)
    store.delete({ name: VERIFICATION_TOKEN_COOKIE, path: VERIFICATION_TOKEN_PATH });
  if (result.success) redirect('/onboarding?verification=verified');
  return { message: result.message };
}

type TokenAttempt = FormState & { discardToken: boolean };

async function verifyEmailToken(token: ActionToken | null): Promise<TokenAttempt> {
  if (!authConfigured())
    return { message: 'A verificação ainda não está disponível.', discardToken: false };
  const parsed = verificationSchema.safeParse(token);
  if (!parsed.success) return { message: 'Link inválido.', discardToken: true };
  try {
    await createAccount().updateVerification(parsed.data);
  } catch (error) {
    if (definitiveActionTokenError(error))
      return { message: 'Link inválido ou expirado.', discardToken: true };
    return {
      message: 'Não foi possível confirmar o email agora. Tente novamente em instantes.',
      discardToken: false,
    };
  }
  return { success: true, message: 'Email verificado.', discardToken: true };
}
export async function resendAction(): Promise<void> {
  if (!(await allowedRequest()) || !authConfigured()) return;
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return;
  try {
    await createAccount(secret).createVerification({
      url: `${getEnvironment().APP_URL}/verificar-email`,
    });
  } catch {
    return;
  }
  redirect('/onboarding?verification=sent');
}
export async function logoutAction(): Promise<void> {
  if (!(await allowedRequest())) return;
  const store = await cookies();
  const secret = store.get(SESSION_COOKIE)?.value;
  if (secret) {
    try {
      await createAccount(secret).deleteSession({ sessionId: 'current' });
    } catch (error) {
      if ((error as { code?: number }).code !== 401) throw error;
    }
  }
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
export async function onboardingAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!(await allowedRequest())) return { message: 'Solicitação não permitida.' };
  const env = getEnvironment();
  if (env.APPWRITE_FUNCTIONS_ENABLED !== 'true')
    return { message: 'O salvamento do perfil aguarda a ativação segura do Appwrite.' };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? 'Confira os dados.' };
  try {
    const user = await currentUser();
    if (!user?.emailVerification)
      return { message: 'Verifique seu email antes de salvar o perfil.' };
    const secret = (await cookies()).get(SESSION_COOKIE)!.value;
    if ((await readOwnProfile(secret, user.$id))?.onboardingCompletedAt)
      return { message: 'Seu perfil já está completo. Para alterá-lo, acesse Meu perfil no painel.' };
    const result = await new Functions(sessionClient(secret)).createExecution({
      functionId: 'complete-onboarding',
      body: JSON.stringify(parsed.data),
      async: false,
    });
    // O motivo da recusa existe e tem conserto na maioria das vezes: a frase que
    // a pessoa lê sai do que a Function respondeu, não de um "tente mais tarde"
    // que convidava a insistir para sempre.
    if (result.responseStatusCode !== 200)
      return { message: refusalMessage(result.responseStatusCode, result.responseBody) };
  } catch (error) {
    return { message: failureMessage(error) };
  }
  redirect('/app');
}
