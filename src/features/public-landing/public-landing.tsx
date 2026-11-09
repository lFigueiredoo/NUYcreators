import localFont from 'next/font/local';
import { Hero } from './components/hero';
import { EditorialCarousel } from './editorial-carousel';
import { EditorialHeader } from './editorial-header';
import { EditorialFooter, EditorialSections } from './editorial-sections';
import styles from './styles/editorial.module.css';
import { loadPublicInfluencers } from './services/influencers';

const nunito = localFont({
  src: '../../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2',
  variable: '--editorial-sans',
  display: 'swap',
  weight: '400 900',
  fallback: ['Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export async function PublicLanding() {
  const influencers = await loadPublicInfluencers();
  return (
    <div
      id="topo"
      tabIndex={-1}
      className={`${styles.landing} ${nunito.variable}`}
    >
      <EditorialHeader />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Hero />
        <EditorialCarousel influencers={influencers} />
        <EditorialSections />
      </main>
      <EditorialFooter />
    </div>
  );
}
