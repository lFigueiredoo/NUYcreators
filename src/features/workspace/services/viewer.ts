import 'server-only';
import { cache } from 'react';
import { Query } from 'node-appwrite';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/appwrite/server';
import { requireSession } from '@/lib/security/authorization';
import {
  first,
  flag,
  getSessionDocument,
  listSession,
  optionalText,
  text,
  type Document,
  type Loaded,
} from './read';

const SCOPE = 'perfil';

/**
 * Identidade da própria usuária — só o que as coleções realmente guardam.
 *
 * `profiles` é PII privada (docs/database.md) e só é lida com o segredo da
 * própria sessão. Nada aqui sai do escopo pessoal: o que é exibido em telas
 * públicas (ranking) vem de `public_creator_profiles`, nunca daqui.
 */
export type ViewerProfile = {
  name: string;
  avatarFileId: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  birthDate: string | null;
  niche: string | null;
  creatorType: string | null;
  publicProfile: boolean;
  onboarded: boolean;
};

export type SocialAccount = {
  id: string;
  platform: string;
  handle: string | null;
  url: string | null;
  /** `unverified` até existir OAuth autorizado (docs/flows.md §Autenticação). */
  verification: string;
};

export type Viewer = {
  id: string;
  displayName: string;
  /** Primeiro nome para a saudação; vazio quando não há nome real para usar. */
  firstName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  /** `null` quando o documento não existe (perfil ainda não criado). */
  profile: ViewerProfile | null;
  profileState: Loaded<ViewerProfile>['state'];
  socials: Loaded<SocialAccount>;
};

export type WorkspaceSession = { secret: string; viewer: Viewer };

function mapProfile(document: Document): ViewerProfile {
  return {
    name: text(document.name),
    avatarFileId: optionalText(document.avatarFileId),
    city: optionalText(document.city),
    state: optionalText(document.state),
    phone: optionalText(document.phone),
    birthDate: optionalText(document.birthDate),
    niche: optionalText(document.niche),
    creatorType: optionalText(document.creatorType),
    publicProfile: flag(document.publicProfile),
    // Marcador gravado por último pela function `complete-onboarding`.
    onboarded: Boolean(optionalText(document.onboardingCompletedAt)),
  };
}

function mapSocial(document: Document): SocialAccount {
  return {
    id: text(document.$id),
    platform: text(document.platform),
    handle: optionalText(document.handle),
    url: optionalText(document.canonicalUrl),
    verification: text(document.verificationStatus) || 'unverified',
  };
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0] ?? '';
}

/**
 * Uma leitura por requisição: layout e tela compartilham o mesmo resultado
 * (React `cache`), então a sessão não é relida a cada componente que precisa
 * dela.
 */
export const workspaceSession = cache(async (): Promise<WorkspaceSession> => {
  const user = await requireSession();
  const secret = (await cookies()).get(SESSION_COOKIE)!.value;
  const [profile, socials] = await Promise.all([
    getSessionDocument(secret, SCOPE, 'profiles', user.$id, mapProfile),
    listSession(secret, SCOPE, 'social_accounts', mapSocial, {
      queries: [Query.equal('userId', user.$id)],
    }),
  ]);
  const loadedProfile = first(profile);
  const displayName = loadedProfile?.name || user.name || '';
  return {
    secret,
    viewer: {
      id: user.$id,
      displayName,
      firstName: firstWord(displayName),
      email: user.email,
      emailVerified: Boolean(user.emailVerification),
      createdAt: text(user.$createdAt),
      profile: loadedProfile,
      profileState: profile.state,
      socials,
    },
  };
});
