import { AuthForm } from '@/features/auth/components/auth-form';
import { authConfigured } from '@/lib/appwrite/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar' };
export default function Login() {
  return (
    <>
      <p className="eyebrow">Que bom ter você aqui</p>
      <h1>
        Entre no seu
        <br />
        <em>próximo capítulo.</em>
      </h1>
      <AuthForm mode="login" configured={authConfigured()} />
    </>
  );
}
