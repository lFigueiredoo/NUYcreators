'use client';
import { useActionState, useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { reviewCreatorApplicationAction } from '../services/actions';
import type { AccountApprovalStatus } from '../domain/approval';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from './approvals.module.css';

export function ApprovalReviewForm({
  userId,
  status,
  onboarded,
}: {
  userId: string;
  status: AccountApprovalStatus;
  onboarded: boolean;
}) {
  const id = useId();
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [state, action, pending] = useActionState(reviewCreatorApplicationAction, { message: '' });
  return (
    <form action={action} className={styles.reviewForm} aria-label="Decidir sobre o cadastro">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="expectedStatus" value={status} />
      <fieldset className={styles.decisions} disabled={pending}>
        <legend>Decisão sobre o acesso</legend>
        <label className={styles.decisionOption}>
          <input
            type="radio"
            name="decision"
            value="approve"
            checked={decision === 'approve'}
            onChange={() => setDecision('approve')}
            disabled={!onboarded}
            required
          />
          <Check size={16} aria-hidden="true" /> Aprovar conta
        </label>
        <label className={styles.decisionOption}>
          <input
            type="radio"
            name="decision"
            value="reject"
            checked={decision === 'reject'}
            onChange={() => setDecision('reject')}
            required
          />
          <X size={16} aria-hidden="true" /> Recusar cadastro
        </label>
      </fieldset>
      {!onboarded ? (
        <p className={styles.hint}>
          A aprovação ficará disponível quando a pessoa concluir o perfil.
        </p>
      ) : null}
      {decision === 'reject' ? (
        <div className={styles.field}>
          <label htmlFor={`${id}-reason`}>Motivo da recusa</label>
          <textarea
            id={`${id}-reason`}
            name="reason"
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            aria-describedby={`${id}-hint`}
          />
          <p id={`${id}-hint`} className={styles.hint}>
            A pessoa verá esta orientação. Explique a decisão de forma clara e respeitosa.
          </p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending || !decision}
        className={`${appStyles.button} ${decision === 'reject' ? appStyles.buttonGhost : appStyles.buttonPrimary}`}
      >
        {pending
          ? 'Registrando decisão…'
          : !decision
            ? 'Escolha uma decisão'
            : decision === 'reject'
              ? 'Confirmar recusa'
              : 'Confirmar aprovação'}
      </button>
      {state.message ? (
        <p role="alert" className={styles.feedback}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
