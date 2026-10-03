import { verifyIntegrationIdentity } from '../../infra/appwrite/identity';
export default async function preflight() {
  await verifyIntegrationIdentity(process.env);
}
