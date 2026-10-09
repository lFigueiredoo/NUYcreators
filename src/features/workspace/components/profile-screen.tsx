import Link from 'next/link';
import { ChevronDown, ExternalLink, Info, Link2, Pencil } from 'lucide-react';
import { brazilianStates, creatorTypes, niches } from '@/features/profiles/schemas/onboarding';
import { longDate } from '../domain/format';
import { creatorTypeLabel, nicheLabel, platformLabel } from '../domain/labels';
import type { SocialAccount, Viewer } from '../services/viewer';
import { ProfileEditForm } from './core-forms';
import { Card } from './ui/card';
import { Block, ScreenHeader } from './ui/screen';
import { UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Campo de leitura: rótulo em caixa baixa (a etiqueta da creator não grita) e o
 * valor real — ou a ausência dele. "Não informado" é ausência, não zero.
 */
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

/**
 * Perfil — só o que as coleções realmente guardam.
 *
 * Os campos exibidos são exatamente os do onboarding (nenhum campo novo, nenhum
 * campo persistido inventado). A edição grava pelo servidor, com a MESMA régua
 * do cadastro: sem a operação configurada, a tela diz isso em vez de fingir um
 * botão que grava.
 *
 * A ordem é a de quem chega: quem ela é (cabeçalho), o que a comunidade vê, os
 * dados que ela informou, o formulário de edição, as redes e as preferências. O
 * formulário fica FECHADO por padrão: com ele aberto no topo, a página mostrava
 * os mesmos oito campos duas vezes seguidas — uma para ler, outra para editar —
 * e a leitura ficava parecendo rascunho de formulário.
 *
 * "Não verificado" nas redes é o estado real (`verificationStatus`), nunca um
 * selo de verificação sem OAuth autorizado.
 */
export function ProfileScreen({
  viewer,
  level,
  editEnabled,
}: {
  viewer: Viewer;
  /** Nível da jornada, lido pelo servidor — o mesmo do cabeçalho do app. */
  level: string | null;
  editEnabled: boolean;
}) {
  const profile = viewer.profile;
  const profileUnavailable = viewer.profileState === 'unavailable';
  const socials = viewer.socials.state === 'ok' ? viewer.socials.items : [];
  const socialsUnavailable = viewer.socials.state === 'unavailable';
  const initial = (viewer.displayName.trim()[0] ?? 'N').toUpperCase();

  return (
    <>
      <ScreenHeader
        kicker="Meu perfil"
        title="Seu perfil"
        intro="Seus dados na comunidade NUY Creators — o que está guardado hoje na sua conta."
        className={styles.enter}
        action={
          editEnabled ? null : (
            <Link href="/onboarding" className={`${styles.button} ${styles.buttonGhost}`}>
              Editar meu perfil
            </Link>
          )
        }
      />

      {/* Cabeçalho: quem ela é, em uma linha. Nome, nível, e-mail e data de
          entrada vivem aqui — não se repetem campo a campo lá embaixo. */}
      <Card className={`${styles.profileHead} ${styles.enter} ${styles.i1}`}>
        <span className={styles.profileAvatar} aria-hidden="true">
          {initial}
        </span>
        <div className={styles.profileIdentity}>
          <h2 className={styles.profileName}>{viewer.displayName || 'Creator NUY'}</h2>
          <p className={styles.profileMeta}>
            {level ? <span className={styles.profileLevel}>{level}</span> : null}
            <span>{viewer.email}</span>
            <span
              className={`${styles.pill} ${
                viewer.emailVerified ? styles.toneSuccess : styles.toneMuted
              }`}
            >
              {viewer.emailVerified ? 'E-mail verificado' : 'E-mail ainda não verificado'}
            </span>
          </p>
          <p className={styles.statHint}>Na comunidade desde {longDate(viewer.createdAt)}.</p>
        </div>
      </Card>

      {editEnabled ? null : (
        <div className={`${styles.note} ${styles.enter} ${styles.i2}`} role="status">
          <span className={styles.noteIcon} aria-hidden="true">
            <Info size={18} />
          </span>
          <div className={styles.noteBody}>
            <p className={styles.noteTitle}>Salvar alterações ainda não está disponível.</p>
            <p className={styles.noteText}>
              O formulário de perfil abre normalmente, mas quem grava os dados é o servidor, e a
              operação não está configurada neste ambiente. Nada é alterado antes disso.
            </p>
          </div>
        </div>
      )}

      <Block title="Presença na comunidade" className={`${styles.enter} ${styles.i3}`}>
        <Card>
          <dl className={styles.fields}>
            <Field label="Nome exibido para a comunidade" value={viewer.displayName} />
            <Field label="Nível na jornada" value={level} />
          </dl>
          <p className={styles.statHint}>
            O nome público é o único dado seu que aparece em áreas da comunidade, como o ranking — e
            só ele. E-mail, telefone e endereço nunca aparecem.
          </p>
        </Card>
      </Block>

      <Block title="Dados pessoais" className={`${styles.enter} ${styles.i4}`}>
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
                {/* Os códigos do catálogo viram as palavras que a creator lê. */}
                <Field
                  label="Seu universo"
                  value={profile.niche ? nicheLabel(profile.niche) : null}
                />
                <Field
                  label="Como você cria"
                  value={profile.creatorType ? creatorTypeLabel(profile.creatorType) : null}
                />
              </dl>
            ) : (
              <p className={styles.statHint}>
                Seu perfil ainda não foi criado. O preenchimento é feito no formulário de perfil, e
                o que você informar aparece aqui.
              </p>
            )}
          </Card>
        )}
      </Block>

      {editEnabled && profile ? (
        <Block title="Editar meus dados" className={`${styles.enter} ${styles.i5}`}>
          {/* Formulário fechado: a página lê primeiro, edita quando ela pedir. O
              `<summary>` é o controle nativo — teclado e leitor de tela já sabem
              operá-lo, e o rótulo diz exatamente o que vai abrir. */}
          <details className={styles.editor}>
            <summary className={styles.editorSummary}>
              <Pencil size={16} aria-hidden="true" />
              Abrir o formulário de edição
              <ChevronDown size={16} aria-hidden="true" className={styles.editorChevron} />
            </summary>
            <Card className={styles.editorBody}>
              <ProfileEditForm
                initial={{
                  name: profile.name,
                  phone: profile.phone ?? '',
                  city: profile.city ?? '',
                  state: profile.state ?? brazilianStates[0],
                  birthDate: profile.birthDate ?? '',
                  niche: profile.niche ?? niches[0],
                  creatorType: profile.creatorType ?? creatorTypes[0],
                  publicProfile: profile.publicProfile,
                }}
                states={[...brazilianStates]}
                niches={[...niches]}
                creatorTypes={[...creatorTypes]}
              />
            </Card>
          </details>
        </Block>
      ) : null}

      <Block title="Perfis sociais" className={`${styles.enter} ${styles.i5}`}>
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

      <Block title="Preferências" className={`${styles.enter} ${styles.i5}`}>
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
          <h3 className={styles.itemTitle}>{platformLabel(social.platform)}</h3>
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
