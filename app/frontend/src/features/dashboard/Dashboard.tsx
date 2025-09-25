import { useMemo } from 'react';
import { useExperienceStore } from '../../hooks/useExperienceStore';
import { Icon } from '../../components/ui/Icon';
import '../../components/ui/ui.css';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const Dashboard = () => {
  const { funBalance, creditUtilization, accounts, transactions, quests, streakDays } = useExperienceStore();

  const totalChange = useMemo(
    () =>
      accounts.reduce((total, account) => total + account.balance * (account.change / 100), 0) /
      accounts.reduce((total, account) => total + account.balance, 0),
    [accounts]
  );

  return (
    <div className="grid two">
      <section className="card">
        <div className="section-title">
          <div>
            <h2>Main vault overview</h2>
            <p>Track balances, streaks, and ongoing quests at a glance.</p>
          </div>
          <div className="badge success">
            <Icon name="trendUp" />
            {formatNumber(totalChange * 100)}% daily drift
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <span>Fun balance</span>
            <strong>{formatCurrency(funBalance)}</strong>
            <div className="tag">
              <Icon name="sparkles" />
              Vault boosted today
            </div>
          </div>
          <div className="metric-card">
            <span>Credit utilization</span>
            <strong>{creditUtilization}%</strong>
            <div className="badge warning">
              <Icon name="flame" />
              Watch comfort zone
            </div>
          </div>
          <div className="metric-card">
            <span>Daily streak</span>
            <strong>{streakDays} days</strong>
            <div className="tag">
              <Icon name="repeat" />
              Auto quest refresh
            </div>
          </div>
        </div>
        <div className="grid two" style={{ marginTop: '2rem' }}>
          <div className="card dense">
            <h3>Account lineup</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Balance</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{formatCurrency(account.balance)}</td>
                    <td style={{ color: account.change >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                      {account.change >= 0 ? '+' : ''}
                      {account.change}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card dense">
            <h3>Quests & boosts</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
              {quests.map((quest) => (
                <li key={quest.id} className="quest-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{quest.title}</strong>
                      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{quest.reward}</p>
                    </div>
                    <span className="badge">
                      <Icon name="check" />
                      {quest.progress}/3
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(212, 124, 79, 0.15)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${(quest.progress / 3) * 100}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'var(--accent-gradient)'
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <aside className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <div className="section-title">
            <h2>Latest activity</h2>
            <p>Real-time ledger updates streamed from the middleware.</p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
            {transactions.map((txn) => (
              <li key={txn.id} className="card dense" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span className="eyebrow">{txn.timestamp}</span>
                <strong>{txn.description}</strong>
                <span style={{ color: txn.type === 'credit' ? 'var(--success)' : 'var(--warning)' }}>
                  {txn.type === 'credit' ? '+' : '-'}
                  {formatCurrency(Math.abs(txn.amount))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card dense">
          <h3>Celebrations</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
            Unlock confetti, aurora beams, or disco beats when you hit milestones.
          </p>
          <button className="chip">
            Configure celebrations
            <Icon name="sparkles" />
          </button>
        </div>
      </aside>
    </div>
  );
};
