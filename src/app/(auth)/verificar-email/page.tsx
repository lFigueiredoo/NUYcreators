import { AuthForm } from '@/features/auth/components/auth-form';
import { authConfigured } from '@/lib/appwrite/server';
export const dynamic = 'force-dynamic';
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1>
        Confirme seu email.
        <br />
        Vamos florescer.
      </h1>
      <AuthForm
        mode="verify"
        configured={authConfigured()}
        token={{ userId: params.userId ?? '', secret: params.secret ?? '' }}
      />
    </>
  );
}
