import { verifyReadOnlyIdentity, IdentityError } from './identity';
// Read-only identity probes. No response bodies/headers/credentials printed.
const env = process.env;
const required = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_EXPECTED_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_AUTH_API_KEY',
];
console.log(
  JSON.stringify(
    {
      required: Object.fromEntries(required.map((name) => [name, Boolean(env[name])])),
      dedicatedConfirmed: env.APPWRITE_DEDICATED_PROJECT_CONFIRMED === 'true',
      testEnvironment: env.APPWRITE_TEST_ENVIRONMENT ?? 'not-confirmed',
      registrationEnabled: env.APPWRITE_REGISTRATION_ENABLED === 'true',
      rateLimitVerified: env.AUTH_RATE_LIMIT_VERIFIED === 'true',
    },
    null,
    2,
  ),
);
try {
  console.log(JSON.stringify(await verifyReadOnlyIdentity(env), null, 2));
} catch (error) {
  console.error(
    error instanceof IdentityError
      ? error.message
      : error instanceof Error && !('response' in error)
        ? error.message
        : 'Preflight bloqueado; credenciais/escopos ainda não confirmados.',
  );
  process.exitCode = 1;
}
