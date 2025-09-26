import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/ui/Icon';
import { createTransfer, type CreateTransferInput, type ExperienceSnapshot } from '../../api/experience';
import { useExperienceSnapshot } from '../../hooks/useExperienceSnapshot';
import '../../components/ui/ui.css';

interface TransferDraft {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  memo: string;
}

const steps = ['Details', 'Review', 'Celebrate'];

export const TransferWizard = () => {
  const { data, isLoading, isError, error, refetch } = useExperienceSnapshot();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransferDraft>({
    sourceAccountId: '',
    destinationAccountId: '',
    amount: 0,
    memo: ''
  });

  useEffect(() => {
    if (data?.accounts.length && !draft.sourceAccountId) {
      setDraft((current) => ({
        ...current,
        sourceAccountId: current.sourceAccountId || data.accounts[0].id,
        destinationAccountId:
          current.destinationAccountId ||
          (data.accounts.length > 1 ? data.accounts[1]?.id ?? '' : '')
      }));
    }
  }, [data?.accounts, draft.sourceAccountId, draft.destinationAccountId]);

  const selectedSource = useMemo(
    () => data?.accounts.find((account) => account.id === draft.sourceAccountId),
    [data?.accounts, draft.sourceAccountId]
  );

  const mutation = useMutation({
    mutationFn: (input: CreateTransferInput) => createTransfer(input),
    onMutate: async (input) => {
      setFormError(null);
      await queryClient.cancelQueries({ queryKey: ['experienceSnapshot'] });
      const previous = queryClient.getQueryData<ExperienceSnapshot>(['experienceSnapshot']);
      if (!previous) {
        return { previous: null };
      }

      const optimisticId = `optimistic-${Date.now()}`;
      const updatedAccounts = previous.accounts.map((account) => {
        if (account.id === input.sourceAccountId) {
          return {
            ...account,
            availableBalance: Math.max(0, account.availableBalance - input.amount)
          };
        }
        if (account.id === input.destinationAccountId) {
          return {
            ...account,
            availableBalance: account.availableBalance + input.amount
          };
        }
        return account;
      });

      const optimisticActivity = [
        {
          id: optimisticId,
          description: `Transfer ${input.sourceAccountId} → ${input.destinationAccountId}`,
          amount: input.amount,
          currency: input.currency,
          type: 'debit' as const,
          status: 'pending',
          occurredAt: new Date().toISOString()
        },
        ...previous.activity
      ];

      queryClient.setQueryData<ExperienceSnapshot>(['experienceSnapshot'], {
        ...previous,
        accounts: updatedAccounts,
        activity: optimisticActivity
      });

      return { previous, optimisticId };
    },
    onError: (mutationError, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['experienceSnapshot'], context.previous);
      }
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : 'We could not send your transfer. Please review the guidance below and try again.'
      );
      setActiveStep(0);
    },
    onSuccess: () => {
      setActiveStep(2);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['experienceSnapshot'] });
    }
  });

  const goBack = () => setActiveStep((step) => Math.max(0, step - 1));

  const validateDraft = (): boolean => {
    if (!draft.sourceAccountId) {
      setFormError('Select a source account to continue.');
      return false;
    }
    if (!draft.destinationAccountId) {
      setFormError('Add a destination account or friend identifier.');
      return false;
    }
    if (draft.destinationAccountId === draft.sourceAccountId) {
      setFormError('Destination must be different from the source account.');
      return false;
    }
    if (draft.amount <= 0) {
      setFormError('Enter an amount greater than zero.');
      return false;
    }
    if (selectedSource && draft.amount > selectedSource.availableBalance) {
      setFormError('Amount exceeds the available balance of the source account.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const goNext = () => {
    if (activeStep === 0) {
      if (!validateDraft()) {
        return;
      }
    }
    if (activeStep === 1) {
      const input: CreateTransferInput = {
        sourceAccountId: draft.sourceAccountId,
        destinationAccountId: draft.destinationAccountId,
        amount: draft.amount,
        currency: selectedSource?.currency ?? 'VBC',
        note: draft.memo || undefined
      };
      mutation.mutate(input);
      return;
    }
    setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  };

  const reset = () => {
    setDraft({
      sourceAccountId: data?.accounts[0]?.id ?? '',
      destinationAccountId: data?.accounts[1]?.id ?? '',
      amount: 0,
      memo: ''
    });
    setActiveStep(0);
    setFormError(null);
  };

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Transfer wizard</h2>
          <p>Loading accounts from the middleware…</p>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Transfer wizard</h2>
          <p>We were unable to load accounts. Confirm your API key and try again.</p>
        </div>
        <p style={{ color: 'var(--warning)' }}>{(error as Error)?.message ?? 'Unknown error'}</p>
        <button className="chip" onClick={() => refetch()}>
          Retry
          <Icon name="repeat" />
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Transfer wizard</h2>
          <p>Optimistic updates keep balances fresh while middleware confirms the ledger.</p>
        </div>
        <div className="badge">
          Step {activeStep + 1} of {steps.length}
        </div>
      </div>
      <div className="grid three" style={{ marginBottom: '2rem' }}>
        {steps.map((stepLabel, index) => (
          <div key={stepLabel} className={`card dense ${index === activeStep ? 'active-step' : ''}`}>
            <div className="tag">
              <Icon name="sparkles" />
              {stepLabel}
            </div>
            <h3>{stepLabel}</h3>
            <p>
              {index === 0
                ? 'Select vaults, recipients, and amounts.'
                : index === 1
                ? 'Double-check fees, memos, and safety checks.'
                : 'Send with style—confetti and receipts included.'}
            </p>
          </div>
        ))}
      </div>
      {formError && (
        <div className="card dense" style={{ border: '1px solid var(--warning)', color: 'var(--warning)' }}>
          <strong>We need a quick fix:</strong>
          <p style={{ marginTop: '0.5rem' }}>{formError}</p>
          <ul style={{ margin: '0.5rem 0 0 1.2rem' }}>
            <li>Confirm the source vault has enough available balance.</li>
            <li>Make sure the destination identifier is correct.</li>
            <li>Keep amounts positive to avoid rollback.</li>
          </ul>
        </div>
      )}
      {activeStep === 0 && (
        <form className="grid two" style={{ gap: '2rem' }} onSubmit={(event) => event.preventDefault()}>
          <div className="card dense">
            <h3>Transfer details</h3>
            <label className="input-group">
              <span>From vault</span>
              <select
                value={draft.sourceAccountId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sourceAccountId: event.target.value }))
                }
              >
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} ({account.currency})
                  </option>
                ))}
              </select>
              {selectedSource && (
                <span className="eyebrow">Available: {selectedSource.availableBalance.toFixed(2)} {selectedSource.currency}</span>
              )}
            </label>
            <label className="input-group">
              <span>To friend or account</span>
              <input
                value={draft.destinationAccountId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, destinationAccountId: event.target.value }))
                }
                placeholder="friend-or-account-id"
              />
            </label>
            <label className="input-group">
              <span>Amount</span>
              <input
                type="number"
                value={draft.amount}
                onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
                min={1}
              />
            </label>
            <label className="input-group">
              <span>Memo</span>
              <textarea
                value={draft.memo}
                onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))}
                placeholder="Thank you for the quest help!"
                rows={3}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="chip ghost" onClick={goBack} disabled={activeStep === 0}>
                Back
              </button>
              <button type="button" className="chip" onClick={goNext}>
                Continue
                <Icon name="arrowRight" />
              </button>
            </div>
          </div>
          <div className="card dense">
            <h3>Safety checklist</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
              {['Recipient verified', 'Quest limit respected', 'No cooldown conflicts'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="badge success">
                    <Icon name="check" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </form>
      )}
      {activeStep === 1 && (
        <div className="grid two">
          <div className="card dense">
            <h3>Review</h3>
            <p>
              You are about to send <strong>{draft.amount} {selectedSource?.currency ?? 'FunCoins'}</strong> from{' '}
              <strong>{selectedSource?.label ?? draft.sourceAccountId}</strong> to{' '}
              <strong>{draft.destinationAccountId}</strong>.
            </p>
            {draft.memo && (
              <p>
                <em>Memo:</em> {draft.memo}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)' }}>
              Estimated settlement in 3 seconds. Ledger receipts will show in your activity feed instantly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="chip ghost" onClick={goBack}>
                Back
              </button>
              <button className="chip" onClick={goNext} disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending…' : 'Send transfer'}
                <Icon name="sparkles" />
              </button>
            </div>
          </div>
          <div className="card dense">
            <h3>Fee breakdown</h3>
            <table className="table">
              <tbody>
                <tr>
                  <td>Maker/taker fees</td>
                  <td>0.2 FunCoins</td>
                </tr>
                <tr>
                  <td>Quest bonus</td>
                  <td>+12 FunCoins</td>
                </tr>
                <tr>
                  <td>Net change</td>
                  <td>+11.8 FunCoins</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeStep === 2 && (
        <div className="card dense" style={{ textAlign: 'center' }}>
          <h3>Transfer sent!</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Confetti launched, receipts delivered, and your streak just leveled up.
          </p>
          <button className="chip" onClick={reset}>
            Send another transfer
          </button>
        </div>
      )}
    </section>
  );
};
