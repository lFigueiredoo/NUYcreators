import Link from 'next/link';
import { ExternalLink, Info, Link2 } from 'lucide-react';
import { longDate } from '../domain/format';
import type { SocialAccount, Viewer } from '../services/viewer';
import { Card } from './ui/card';
import { Block, ScreenHeader } from './ui/screen';
import { UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/** Campo de leitura: rótulo em maiúsculas e valor real — ou a ausência dele. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={value ? styles.fieldValue : `${styles.fieldValue} ${styles.fieldMissing}`}>
        {value || 'Não informado'}
      </dd>
    </div>
  );
}

const PLATFORM: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

/**
 * Perfil — só o que as coleções realmente guardam.
 *
 * Os campos exibidos são exatamente os do onboarding (nenhum campo novo, nenhum
 * campo persistido inventado). A edição continua sendo o formulário de perfil,
 * cujo salvamento depende da function `complete-onboarding`: enquanto ela não
 * estiver ativa, a tela diz isso em vez de fingir um botão que grava.
 *
 * "Não verificado" nas redes é o estado real (`verificationStatus`), nunca um
 * selo de verificação sem OAuth autorizado.
 */
export function ProfileScreen({ viewer }: { viewer: Viewer }) {
  const profile = viewer.profile;
  const profileUnavailable = viewer.profileState === 'unavailable';
  const socials = viewer.socials.state === 'ok' ? viewer.socials.items : [];
  const socialsUnavailable = viewer.socials.state === 'unavailable';

  return (
    <>
      <ScreenHeader
        kicker="Meu perfil"
        title="Seu perfil"
        intro="Seus dados na comunidade NUY Creators — o que está guardado hoje na sua conta."
        action={
          <Link href="/onboarding" className={`${styles.button} ${styles.buttonGhost}`}>
            Editar meu perfil
          </Link>
        }
      />

      <div className={styles.note} role="status">
        <span className={styles.noteIcon} aria-hidden="true">
          <Info size={18} />
        </span>
        <div className={styles.noteBody}>
          <p className={styles.noteTitle}>Salvar alterações ainda não está disponível.</p>
          <p className={styles.noteText}>
            O formulário de perfil abre normalmente, mas quem grava os dados é o serviço de perfis,
            que ainda não entrou no ar. Nada é alterado antes disso.
          </p>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <Block title="Identidade">
          <Card>
            <dl className={styles.fields}>
              <Field label="Nome" value={viewer.displayName} />
              <Field label="E-mail" value={viewer.email} />
              <Field
                label="E-mail verificado"
                value={viewer.emailVerified ? 'Verificado' : 'Ainda não verificado'}
              />
              <Field label="Na comunidade desde" value={longDate(viewer.createdAt)} />
            </dl>
          </Card>
        </Block>

        <Block title="Sobre você">
          {profileUnavailable ? (
            <UnavailableState what="seus dados de perfil" />
          ) : (
            <Card>
              {profile ? (
                <dl className={styles.fields}>
                  <Field label="Telefone" value={profile.phone} />
                  <Field label="Cidade" value={profile.city} />
                  <Field label="UF" value={profile.state} />
                  <Field label="Data de nascimento" value={longDate(profile.birthDate)} />
                  <Field label="Seu universo" value={profile.niche} />
                  <Field label="Como você cria" value={profile.creatorType} />
                </dl>
              ) : (
                <p className={styles.statHint}>
                  Seu perfil ainda não foi criado. O preenchimento é feito no formulário de perfil,
                  e o que você informar aparece aqui.
                </p>
              )}
            </Card>
          )}
        </Block>
      </div>

      <Block title="Perfis sociais">
        {socialsUnavailable ? (
          <UnavailableState what="seus perfis sociais" />
        ) : socials.length > 0 ? (
          <>
            <ul className={styles.list}>
              {socials.map((social) => (
                <SocialRow key={social.id} social={social} />
              ))}
            </ul>
            <p className={styles.statHint}>
              Links declarados por você. Aparecem como <strong>Não verificado</strong> porque
              nenhuma conexão oficial com as redes foi feita ainda.
            </p>
          </>
        ) : (
          <Card>
            <p className={styles.statHint}>
              Nenhuma rede social informada. Você pode declarar seus perfis no formulário de perfil
              — eles aparecem aqui como não verificados.
            </p>
          </Card>
        )}
      </Block>

      <Block title="Preferências">
        {profileUnavailable ? (
          <UnavailableState what="suas preferências" />
        ) : (
          <Card>
            <dl className={styles.fields}>
              <Field
                label="Perfil público"
                value={profile ? (profile.publicProfile ? 'Ativado' : 'Desativado') : null}
              />
            </dl>
            <p className={styles.statHint}>
              Com o perfil público ativado, seu nome pode aparecer em áreas da comunidade como o
              ranking — e apenas o nome público, sem e-mail, telefone ou endereço.
            </p>
          </Card>
        )}
      </Block>
    </>
  );
}

/**
 * Estado real da verificação. `verified` não tem tradução própria: enquanto não
 * existir integração oficial, o único valor esperado é `unverified` — e qualquer
 * valor novo é exibido cru, jamais como um selo de verificado.
 */
const VERIFICATION: Record<string, string> = {
  unverified: 'Não verificado',
  pending: 'Verificação em andamento',
};

function SocialRow({ social }: { social: SocialAccount }) {
  return (
    <li className={styles.item}>
      <span className={styles.thumb} aria-hidden="true">
        <Link2 size={16} />
      </span>
      <div className={styles.itemMain}>
        <div className={styles.itemHead}>
          <h3 className={styles.itemTitle}>{PLATFORM[social.platform] ?? social.platform}</h3>
          <span className={`${styles.pill} ${styles.toneNeutral}`}>
            {VERIFICATION[social.verification] ?? social.verification}
          </span>
        </div>
        <p className={styles.itemText}>
          {social.handle || social.url || 'Perfil sem identificador'}
        </p>
      </div>
      {social.url ? (
        <a href={social.url} className={styles.blockLink} target="_blank" rel="noreferrer noopener">
          Abrir
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : null}
    </li>
  );
}
