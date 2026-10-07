import { Account, Client, TablesDB } from 'node-appwrite';
import { ownerReadPermissions } from '../../src/lib/security/permissions';
import { onboardingSchema } from '../../src/features/profiles/schemas/onboarding';
import { createHash } from 'node:crypto';
type Context = {
  req: { headers: Record<string, string>; bodyJson: unknown };
  res: { json: (data: unknown, status?: number) => unknown };
  error: (message: string) => void;
};
type Services = {
  account: (client: Client) => Pick<Account, 'get'>;
  tables: (client: Client) => Pick<TablesDB, 'getRow' | 'createRow' | 'updateRow' | 'deleteRow'>;
};
const sdkServices: Services = {
  account: (client) => new Account(client),
  tables: (client) => new TablesDB(client),
};
// The optional adapter is used only by isolated unit tests, never derived from requests.
export default async function main({ req, res, error }: Context, services: Services = sdkServices) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = req.headers['x-appwrite-key'];
  const jwt = req.headers['x-appwrite-user-jwt'];
  if (!endpoint || !project || !key || !jwt) return res.json({ error: 'unauthorized' }, 401);
  const parsed = onboardingSchema.safeParse(req.bodyJson);
  if (!parsed.success) return res.json({ error: 'invalid_profile' }, 400);
  const termsVersion = process.env.NUY_TERMS_VERSION;
  const minimumAge = Number(process.env.NUY_MINIMUM_AGE);
  if (!termsVersion || !Number.isInteger(minimumAge) || minimumAge < 18)
    return res.json({ error: 'participation_policy_unconfigured' }, 503);
  const birth = new Date(`${parsed.data.birthDate}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  if (age < minimumAge) return res.json({ error: 'age_requirement' }, 400);
  try {
    // Verify caller with Appwrite, never trust a supplied userId or role.
    const user = await services
      .account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt))
      .get();
    if (!user.emailVerification) return res.json({ error: 'email_not_verified' }, 403);
    const db = services.tables(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
    const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
    const permissions = ownerReadPermissions(user.$id);
    async function upsert(tableId: string, rowId: string, data: Record<string, unknown>) {
      try {
        const existing = await db.getRow({ databaseId, tableId, rowId });
        if (existing.userId !== undefined && existing.userId !== user.$id)
          throw new Error('ownership');
        await db.updateRow({ databaseId, tableId, rowId, data, permissions });
      } catch (err) {
        if ((err as { code?: number }).code !== 404) throw err;
        try {
          await db.createRow({ databaseId, tableId, rowId, data, permissions });
        } catch (conflict) {
          // Concurrent onboarding: retry is safe, but never report partial write as success.
          if ((conflict as { code?: number }).code !== 409) throw conflict;
          await db.updateRow({ databaseId, tableId, rowId, data, permissions });
        }
      }
    }
    const { instagram, tiktok, youtube } = parsed.data;
    const profile = { ...parsed.data };
    const profileData = {
      name: profile.name,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
      birthDate: profile.birthDate,
      niche: profile.niche,
      creatorType: profile.creatorType,
    };
    // No financial writes here. Sequential onboarding is resumable, NOT claimed atomic.
    try {
      const record = await db.getRow({
        databaseId,
        tableId: 'users',
        rowId: user.$id,
      });
      if (record.status !== 'active' || record.authUserId !== user.$id)
        return res.json({ error: 'account_disabled' }, 403);
    } catch (err) {
      if ((err as { code?: number }).code !== 404) throw err;
      try {
        await db.createRow({
          databaseId,
          tableId: 'users',
          rowId: user.$id,
          data: {
            authUserId: user.$id,
            status: 'active',
            acceptedTermsVersion: termsVersion,
            consentAt: new Date().toISOString(),
          },
          permissions,
        });
      } catch (conflict) {
        if ((conflict as { code?: number }).code !== 409) throw conflict;
      }
    }
    for (const [platform, canonicalUrl] of Object.entries({ instagram, tiktok, youtube })) {
      const rowId = createHash('sha256')
        .update(`${user.$id}:${platform}`)
        .digest('hex')
        .slice(0, 36);
      if (canonicalUrl)
        await upsert('social_accounts', rowId, {
          userId: user.$id,
          platform,
          canonicalUrl,
          verificationStatus: 'unverified',
        });
      else {
        try {
          await db.deleteRow({ databaseId, tableId: 'social_accounts', rowId });
        } catch (err) {
          if ((err as { code?: number }).code !== 404) throw err;
        }
      }
    }
    // Completion marker is written last. No points account or fake level assigned.
    await upsert('profiles', user.$id, {
      ...profileData,
      userId: user.$id,
      publicProfile: false,
      onboardingCompletedAt: new Date().toISOString(),
    });
    return res.json({ saved: true }, 200);
  } catch {
    error('onboarding_failed'); // Do not log credentials or private form payload.
    return res.json({ error: 'profile_unavailable' }, 503);
  }
}
