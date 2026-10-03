# Appwrite Functions

`complete-onboarding` contains a real handler with JWT verification, Zod validation, server-selected user identity and owner-only read permissions. It makes resumable sequential profile writes, NOT financial transactions.

Build from this directory with `npm install` then `npm run build`; upload the directory containing `package.json`, `package-lock.json` and generated `src/main.js` via Cloud Console. Source imports are bundled; node-appwrite and Zod installed by `npm ci` on deployment. Configure `APPWRITE_DATABASE_ID` in the Function environment.

Provisioning creates disabled containers, not deployments. After deploying this handler in staging, set execution permission to authenticated users, enable only this Function, test ownership/direct SDK denial and enable `APPWRITE_FUNCTIONS_ENABLED` on the web server. Validate that Appwrite injects user JWT for authenticated execution. No credentials embedded in code.

Other Function containers are explicitly unimplemented and must remain disabled. Never enable financial/moderation Functions before the real-cloud transactional test gate is implemented and passes.

Legal/age policy and definitive terms version are launch blockers. Configure `NUY_TERMS_VERSION` and `NUY_MINIMUM_AGE` after legal approval; the handler refuses to save without them and checks minimum age (18+ supported). Publish approved legal pages before opening registration. No default consent policy is fabricated.
