import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { hasCapability } from '@/lib/security/memberships';
import type { AdminRole } from '@/lib/security/permissions';
import { adminFont } from '../admin-fonts';
// Folha global da superfície autenticada (foco e seleção), escopada por `.nuy-app`
// na raiz — a mesma do shell da creator: é a mesma superfície.
import '@/styles/app-surface.css';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { AdminNav, AdminTopbar } from './admin-nav';
import { adminNavEntries, roleLabel, type AdminDestination } from './nav-items';

/**
 * Shell da administração.
 *
 * Mesmo esqueleto do produto (sidebar, topbar, conteúdo), com a marca no mesmo
 * lugar e a mesma navegação por teclado. A diferença é o selo de área e a régua
 * de operação: quem entra aqui sabe que está do outro lado, não na tela da
 * creator.
 *
 * Nenhum dado de negócio é lido aqui. Papel e identidade chegam por prop, vindos
 * do `requireStaff` do layout — uma apuração só, a mesma que barra a rota.
 */
export function AdminShell({
  name,
  email,
  roles,
  children,
}: {
  name: string;
  email: string;
  roles: AdminRole[];
  children: ReactNode;
}) {
  const allowed: AdminDestination[] = adminNavEntries
    .filter((entry) => hasCapability(roles, entry.capability))
    .map((entry) => entry.id);

  return (
    <div className={`${appStyles.app} ${styles.admin} ${adminFont.variable} nuy-app`}>
      <div className={`${appStyles.shell} ${styles.shell}`}>
        <aside className={`${appStyles.sidebar} ${styles.sidebar}`}>
          <Link
            href="/admin"
            className={`${appStyles.brand} ${styles.brand}`}
            aria-label="NUY Creators — administração"
          >
            <Image
              src="/brand/logo/nuy-creators-lockup.png"
              alt=""
              width={640}
              height={149}
              sizes="95px"
              className={appStyles.brandImage}
              loading="eager"
            />
          </Link>
          <p className={styles.chip}>
            <ShieldCheck size={13} aria-hidden="true" />
            Área administrativa
          </p>
          <AdminNav allowed={allowed} />
        </aside>
        <div className={appStyles.body}>
          <AdminTopbar name={name} email={email} role={roleLabel(roles)} allowed={allowed} />
          <main id="main" className={`${appStyles.main} ${styles.main}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
