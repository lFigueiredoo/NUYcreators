import { Footer } from '@/components/layout/footer';
import { PublicMotion } from '@/features/community/components/public-motion';
import { Landing } from '@/features/community/components/landing';
import { currentUser } from '@/lib/appwrite/server';
import {
  editorial,
  interfaceFont,
  handwriting,
} from '@/features/community/components/landing-fonts';
import styles from '@/features/community/components/landing.module.css';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await currentUser();
  return (
    <div
      className={`${styles.experience} ${editorial.variable} ${interfaceFont.variable} ${handwriting.variable}`}
    >
      <PublicMotion />
      <main id="main">
        <Landing authenticated={Boolean(user)} />
      </main>
      <Footer />
    </div>
  );
}
