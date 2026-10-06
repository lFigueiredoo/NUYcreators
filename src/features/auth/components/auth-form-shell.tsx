import styles from './auth-access.module.css';

/**
 * Título + texto de apoio + formulário, na coluna da direita da casca.
 *
 * Vive num módulo próprio (sem next/font, sem next/image) porque as telas de
 * recuperação, redefinição e verificação precisam trocar título e texto no
 * cliente depois do envio — elas são componentes de cliente e importam esta
 * peça; a casca com as fontes (`auth-access-shell.tsx`) continua no servidor.
 */
export function AuthFormShell({
  title,
  lead,
  children,
}: {
  title: React.ReactNode;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.formShell}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{lead}</p>
      {children}
    </section>
  );
}
