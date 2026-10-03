import { AuthForm } from '@/features/auth/components/auth-form';
import { registrationConfigured } from '@/lib/appwrite/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fazer parte' };
export default function Signup() {
  return (
    <>
      <p className="eyebrow">Bem-vinda à NUY Creators</p>
      <h1>Seu próximo capítulo começa aqui.</h1>
      <p className="muted">Crie uma conta. Depois, conte um pouco sobre você.</p>
      <AuthForm mode="signup" configured={registrationConfigured()} />
    </>
  );
}
