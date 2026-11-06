import { Account, Client, TablesDB } from 'node-appwrite';
import { onboardingSchema } from '../../src/features/profiles/schemas/onboarding';
import { isAtLeastAge } from '../../src/features/profiles/domain/age';
import { CURRENT_TERMS_VERSION } from '../../src/features/legal/versions';
import { resolveEndpoint } from '../shared/host';
import { randomUUID } from 'node:crypto';
import type { CoreContext } from '../../src/features/workspace/core/context';
import {
  CreatorOnboardingError,
  savePendingCreatorProfile,
} from '../../src/features/accounts/core/onboarding';
type Context = {
  req: { headers: Record<string, string>; bodyJson: unknown };
  res: { json: (data: unknown, status?: number) => unknown };
  error: (message: string) => void;
};
type Services = {
  account: (client: Client) => Pick<Account, 'get'>;
  tables: (client: Client) => CoreContext['tables'];
};
const sdkServices: Services = {
  account: (client) => new Account(client),
  tables: (client) => new TablesDB(client),
};
// The optional adapter is used only by isolated unit tests, never derived from requests.
export default async function main({ req, res, error }: Context, services: Services = sdkServices) {
  // O endpoint injetado passa pela MESMA resolução do núcleo (`shared/host`): sem
  // ela, `createRow` (POST) seguia o 301 para https e VIRAVA GET — a listagem
  // respondia 200 e a function dizia `saved:true` sem ter gravado nada. Medido.
  const injected = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const endpoint = injected ? await resolveEndpoint({ error }, injected) : null;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = req.headers['x-appwrite-key'];
  const jwt = req.headers['x-appwrite-user-jwt'];
  if (!endpoint || !project || !key || !jwt) return res.json({ error: 'unauthorized' }, 401);
  const parsed = onboardingSchema.safeParse(req.bodyJson);
  if (!parsed.success) return res.json({ error: 'invalid_profile' }, 400);
  const termsVersion = process.env.NUY_TERMS_VERSION;
  const minimumAge = Number(process.env.NUY_MINIMUM_AGE);
  if (termsVersion !== CURRENT_TERMS_VERSION || !Number.isInteger(minimumAge) || minimumAge < 18)
    return res.json({ error: 'participation_policy_unconfigured' }, 503);
  if (!isAtLeastAge(parsed.data.birthDate, minimumAge))
    return res.json({ error: 'age_requirement' }, 400);
  try {
    // Verify caller with Appwrite, never trust a supplied userId or role.
    const user = await services
      .account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt))
      .get();
    if (!user.emailVerification) return res.json({ error: 'email_not_verified' }, 403);
    const db = services.tables(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
    const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
    await savePendingCreatorProfile(
      {
        tables: db,
        databaseId,
        actor: { userId: user.$id, roles: [] },
        now: new Date(),
        correlationId: randomUUID(),
      },
      parsed.data,
    );
    return res.json({ saved: true }, 200);
  } catch (cause) {
    if (cause instanceof CreatorOnboardingError)
      return res.json(
        { error: cause.code },
        cause.code === 'profile_unavailable' ? 503 : cause.code === 'account_disabled' ? 403 : 409,
      );
    error('onboarding_failed'); // Do not log credentials or private form payload.
    return res.json({ error: 'profile_unavailable' }, 503);
  }
}
