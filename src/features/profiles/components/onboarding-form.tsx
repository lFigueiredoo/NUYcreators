'use client';
import { useActionState, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleAlert, CircleCheck, Info, LoaderCircle } from 'lucide-react';
import { onboardingAction } from '@/features/auth/services/actions';
import { latestEligibleBirthDate } from '../domain/age';
import { brazilianStates } from '../schemas/onboarding';
import styles from '@/features/auth/components/auth-access.module.css';

/**
 * Formulário de perfil (onboarding) na identidade da Proposta C.
 *
 * MESMOS campos, mesma ordem e mesma persistência de antes: a única mudança é
 * a camada visual — creme, navy, Playfair/Inter, campos e botões das telas de
 * acesso — mais um indicador de preenchimento. Nenhuma pergunta nova.
 *
 * O indicador não simula etapas: ele mede o que de fato existe, os campos
 * essenciais (`required`) do formulário.
 */
const ESSENCIAIS = ['name', 'phone', 'city', 'state', 'birthDate', 'terms'] as const;

export function OnboardingForm({ name, enabled }: { name: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(onboardingAction, { message: '' });
  const [values, setValues] = useState({
    name,
    phone: '',
    city: '',
    state: '',
    birthDate: '',
    niche: 'casa',
    creatorType: 'consumidor',
    instagram: '',
    tiktok: '',
    youtube: '',
    terms: false,
  });
  function set<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const nameId = useId();
  const phoneId = useId();
  const cityId = useId();
  const stateId = useId();
  const birthId = useId();
  const nicheId = useId();
  const creatorTypeId = useId();

  const preenchidos = ESSENCIAIS.filter((field) => {
    const value = values[field];
    return typeof value === 'boolean' ? value : Boolean(value.trim());
  }).length;
  const pct = Math.round((preenchidos / ESSENCIAIS.length) * 100);
  const isError = Boolean(state.message) && !state.success;

  return (
    <form action={action} className={styles.form}>
      {!enabled && (
        <p className={styles.notice} role="status">
          <Info size={16} aria-hidden="true" />
          Perfil disponível para preenchimento; o salvamento aguarda e-mail verificado e ativação do
          backend.
        </p>
      )}

      <div className={styles.progress}>
        <div className={styles.progressHead}>
          <span className={styles.progressLabel}>
            {pct === 100 ? 'Campos essenciais preenchidos.' : 'Preenchimento do perfil'}
          </span>
          <span className={styles.progressValue} aria-hidden="true">
            {pct}%
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Campos essenciais preenchidos"
        >
          <span className={styles.progressBar} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className={styles.groupLabel}>Seus dados</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={nameId}>
          Nome
        </label>
        <input
          id={nameId}
          className={styles.input}
          name="name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={phoneId}>
          Telefone
        </label>
        <input
          id={phoneId}
          className={styles.input}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={values.phone}
          onChange={(event) => set('phone', event.target.value)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={cityId}>
            Cidade
          </label>
          <input
            id={cityId}
            className={styles.input}
            name="city"
            autoComplete="address-level2"
            required
            maxLength={100}
            value={values.city}
            onChange={(event) => set('city', event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={stateId}>
            UF
          </label>
          <select
            id={stateId}
            className={styles.input}
            name="state"
            autoComplete="address-level1"
            required
            value={values.state}
            onChange={(event) => set('state', event.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {brazilianStates.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={birthId}>
          Data de nascimento
        </label>
        <input
          id={birthId}
          className={styles.input}
          name="birthDate"
          type="date"
          autoComplete="bday"
          required
          max={latestEligibleBirthDate()}
          min="1900-01-01"
          value={values.birthDate}
          onChange={(event) => set('birthDate', event.target.value)}
        />
      </div>

      <p className={styles.groupLabel}>Seu universo</p>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nicheId}>
            Seu universo
          </label>
          <select
            id={nicheId}
            className={styles.input}
            name="niche"
            value={values.niche}
            onChange={(event) => set('niche', event.target.value)}
          >
            <option value="casa">Casa</option>
            <option value="bem-estar">Bem-estar</option>
            <option value="beleza">Beleza</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={creatorTypeId}>
            Como você cria
          </label>
          <select
            id={creatorTypeId}
            className={styles.input}
            name="creatorType"
            value={values.creatorType}
            onChange={(event) => set('creatorType', event.target.value)}
          >
            <option value="consumidor">Consumidor</option>
            <option value="ugc">Creator UGC</option>
            <option value="influenciador">Influenciador</option>
          </select>
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Redes sociais · opcionais</legend>
        <p className={styles.muted}>
          Links declarados aparecem como <strong>Não verificado</strong>. Nenhuma conexão OAuth é
          feita.
        </p>
        {(['instagram', 'tiktok', 'youtube'] as const).map((network) => {
          const rotulo =
            network === 'youtube' ? 'YouTube' : network === 'tiktok' ? 'TikTok' : 'Instagram';
          return (
            <div key={network} className={styles.field}>
              <label className={styles.label} htmlFor={`${nicheId}-${network}`}>
                {rotulo}
              </label>
              <input
                id={`${nicheId}-${network}`}
                className={styles.input}
                name={network}
                type="url"
                placeholder={`https://www.${network}.com/seu-perfil`}
                value={values[network]}
                onChange={(event) => set(network, event.target.value)}
              />
            </div>
          );
        })}
      </fieldset>

      <label className={styles.terms}>
        <input
          type="checkbox"
          name="terms"
          required
          checked={values.terms}
          onChange={(event) => set('terms', event.target.checked)}
        />
        <span>
          Declaro que tenho 18 anos ou mais e li e concordo com os{' '}
          <Link href="/termos">Termos de Uso</Link> e a{' '}
          <Link href="/privacidade">Política de Privacidade</Link> do NUY Creators.
        </span>
      </label>

      <button type="submit" className={styles.submit} disabled={!enabled || pending}>
        {pending ? (
          <>
            <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
            Salvando…
          </>
        ) : (
          <>
            Salvar meu perfil
            <ArrowRight size={17} aria-hidden="true" className={styles.arrow} />
          </>
        )}
      </button>

      <p
        className={`${styles.message} ${isError ? styles.error : styles.success}`}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
      >
        {state.message ? (
          isError ? (
            <CircleAlert size={15} aria-hidden="true" />
          ) : (
            <CircleCheck size={15} aria-hidden="true" />
          )
        ) : null}
        {state.message}
      </p>
    </form>
  );
}
