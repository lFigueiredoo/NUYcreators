import { AuthForm } from '@/features/auth/components/auth-form';
import { authConfigured } from '@/lib/appwrite/server';
export const dynamic = 'force-dynamic';
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1>
        Uma nova senha.
        <br />A mesma história.
      </h1>
      <AuthForm
        mode="reset"
        configured={authConfigured()}
        token={{ userId: params.userId ?? '', secret: params.secret ?? '' }}
      />
    </>
  );
}
