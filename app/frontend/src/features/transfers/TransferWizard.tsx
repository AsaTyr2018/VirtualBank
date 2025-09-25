import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import '../../components/ui/ui.css';

interface TransferDraft {
  from: string;
  to: string;
  amount: number;
  memo: string;
}

const steps = ['Details', 'Review', 'Celebrate'];

export const TransferWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<TransferDraft>({ from: 'Core Vault', to: 'Nova Sparks', amount: 250, memo: '' });

  const goNext = () => setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  const goBack = () => setActiveStep((step) => Math.max(0, step - 1));

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
        {steps.map((step, index) => (
          <div key={step} className={`card dense ${index === activeStep ? 'active-step' : ''}`}>
            <div className="tag">
              <Icon name="sparkles" />
              {step}
            </div>
            <h3>{step}</h3>
            <p>{
              index === 0
                ? 'Select vaults, recipients, and amounts.'
                : index === 1
                ? 'Double-check fees, memos, and safety checks.'
                : 'Send with style—confetti and receipts included.'
            }</p>
          </div>
        ))}
      </div>
      {activeStep === 0 && (
        <form className="grid two" style={{ gap: '2rem' }} onSubmit={(event) => event.preventDefault()}>
          <div className="card dense">
            <h3>Transfer details</h3>
            <label className="input-group">
              <span>From vault</span>
              <select value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })}>
                <option>Core Vault</option>
                <option>Quest Goals</option>
                <option>Arcade Stash</option>
              </select>
            </label>
            <label className="input-group">
              <span>To friend</span>
              <input value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
            </label>
            <label className="input-group">
              <span>Amount</span>
              <input
                type="number"
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                min={1}
              />
            </label>
            <label className="input-group">
              <span>Memo</span>
              <textarea
                value={draft.memo}
                onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
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
              {["Recipient verified", 'Quest limit respected', 'No cooldown conflicts'].map((item) => (
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
              You are about to send <strong>{draft.amount} FunCoins</strong> from <strong>{draft.from}</strong> to{' '}
              <strong>{draft.to}</strong>.
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
              <button className="chip" onClick={goNext}>
                Send transfer
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
          <button className="chip" onClick={() => setActiveStep(0)}>
            Send another transfer
          </button>
        </div>
      )}
    </section>
  );
};
