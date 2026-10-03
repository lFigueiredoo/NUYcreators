import { AuthForm } from '@/features/auth/components/auth-form';
import { authConfigured } from '@/lib/appwrite/server';
export const dynamic = 'force-dynamic';
export default function Recovery() {
  return (
    <>
      <p className="eyebrow">Um novo começo</p>
      <h1>
        Vamos recuperar
        <br />
        seu acesso.
      </h1>
      <AuthForm mode="recovery" configured={authConfigured()} />
    </>
  );
}
