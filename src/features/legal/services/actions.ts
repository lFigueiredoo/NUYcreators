'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@/lib/appwrite/server';
import { getEnvironment } from '@/lib/env/server';
import { requireSession } from '@/lib/security/authorization';
import { returnPath } from '@/features/workspace/domain/flash';
import { recordCurrentTermsConsent } from './consent';

export async function acceptCurrentTermsAction(returnTo: string, form: FormData): Promise<void> {
  const destination = returnPath(returnTo, '/app');
  const origin = (await headers()).get('origin');
  if (origin !== new URL(getEnvironment().APP_URL).origin)
    redirect('/aceitar-termos?erro=origem');
  if (form.get('terms') !== 'on') redirect('/aceitar-termos?erro=obrigatorio');
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret || !(await recordCurrentTermsConsent(secret, user.$id)))
    redirect('/aceitar-termos?erro=indisponivel');
  redirect(destination);
}
