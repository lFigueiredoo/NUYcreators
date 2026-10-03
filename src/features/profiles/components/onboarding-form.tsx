'use client';
import { useActionState } from 'react';
import { onboardingAction } from '@/features/auth/services/actions';
import { brazilianStates } from '../schemas/onboarding';
import { Button } from '@/components/ui/button';
export function OnboardingForm({ name, enabled }: { name: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(onboardingAction, { message: '' });
  return (
    <form action={action} className="form-stack">
      {!enabled && (
        <p className="service-notice">
          Perfil disponível para preenchimento; o salvamento aguarda email verificado e ativação do
          backend.
        </p>
      )}
      <label>
        Nome
        <input
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Telefone
        <input name="phone" type="tel" autoComplete="tel" required />
      </label>
      <div className="form-row">
        <label>
          Cidade
          <input name="city" autoComplete="address-level2" required maxLength={100} />
        </label>
        <label>
          UF
          <select name="state" autoComplete="address-level1" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {brazilianStates.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Data de nascimento
        <input
          name="birthDate"
          type="date"
          autoComplete="bday"
          required
          max={new Date().toISOString().slice(0, 10)}
          min="1900-01-01"
        />
      </label>
      <div className="form-row">
        <label>
          Seu universo
          <select name="niche">
            <option value="casa">Casa</option>
            <option value="bem-estar">Bem-estar</option>
            <option value="beleza">Beleza</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label>
          Como você cria
          <select name="creatorType">
            <option value="consumidor">Consumidor</option>
            <option value="ugc">Creator UGC</option>
            <option value="influenciador">Influenciador</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Redes sociais · opcionais</legend>
        <p className="muted">
          Links declarados aparecem como <strong>Não verificado</strong>. Nenhuma conexão OAuth é
          feita.
        </p>
        {['instagram', 'tiktok', 'youtube'].map((network) => (
          <label key={network}>
            {network === 'youtube' ? 'YouTube' : network === 'tiktok' ? 'TikTok' : 'Instagram'}
            <input
              name={network}
              type="url"
              placeholder={`https://www.${network}.com/seu-perfil`}
            />
          </label>
        ))}
      </fieldset>
      <label className="checkbox-label">
        <input type="checkbox" name="terms" required />
        <span>Confirmo os dados e aceito os termos e o tratamento necessário ao meu perfil.</span>
      </label>
      <Button disabled={!enabled || pending} type="submit">
        {pending ? 'Salvando…' : 'Salvar meu perfil'}
      </Button>
      <p aria-live="polite">{state.message}</p>
    </form>
  );
}
