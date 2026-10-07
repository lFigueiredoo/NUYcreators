import { verifyProbeIdentity } from '../../infra/appwrite/identity';
/**
 * Gate da suíte de probes: ambiente dedicado com opt-in, marker remoto válido e
 * chave de teste aceita. A postura da chave SSR é mostrada aqui, mas quem a
 * exige no perfil mínimo é a qualificação do app (`verifyIntegrationIdentity`),
 * não os probes de transação — ver a nota em `infra/appwrite/identity.ts`.
 */
export default async function preflight() {
  const report = await verifyProbeIdentity(process.env);
  console.log(
    `Probes: marker ${report.marker}, chave de teste ${report.testKey}, chave SSR ${report.authKey}.`,
  );
}
