import { Icon } from '../../components/ui/Icon';
import { useExperienceSnapshot } from '../../hooks/useExperienceSnapshot';
import { useSessionStream } from '../../hooks/useSessionStream';
import '../../components/ui/ui.css';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const Dashboard = () => {
  const { data, isLoading, isError, error, refetch } = useExperienceSnapshot();
  useSessionStream(Boolean(data));

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Loading experience</h2>
          <p>Please wait while we fetch live data from the middleware.</p>
        </div>
        <p className="eyebrow">Fetching dashboards…</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Dashboard unavailable</h2>
          <p>We could not reach the middleware. Verify your API credentials and try again.</p>
        </div>
        <p style={{ color: 'var(--warning)' }}>{(error as Error)?.message ?? 'Unknown error'}</p>
        <button className="chip" onClick={() => refetch()}>
          Retry connection
          <Icon name="repeat" />
        </button>
      </section>
    );
  }

  const { player, accounts, quests, activity } = data;

  const totalBalance = accounts.reduce((total, account) => total + account.availableBalance, 0);
  const weightedChange = accounts.reduce((total, account) => {
    if (typeof account.change24h !== 'number') {
      return total;
    }
    return total + account.availableBalance * (account.change24h / 100);
  }, 0);
  const totalChange = totalBalance > 0 ? weightedChange / totalBalance : 0;

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
            <strong>{formatCurrency(player.funBalance)}</strong>
            <div className="tag">
              <Icon name="sparkles" />
              Vault boosted today
            </div>
          </div>
          <div className="metric-card">
            <span>Credit utilization</span>
            <strong>{player.creditUtilization}%</strong>
            <div className="badge warning">
              <Icon name="flame" />
              Watch comfort zone
            </div>
          </div>
          <div className="metric-card">
            <span>Daily streak</span>
            <strong>{player.streakDays} days</strong>
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
                    <td>
                      <strong>{account.label}</strong>
                      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{account.currency}</p>
                    </td>
                    <td>{formatCurrency(account.availableBalance)}</td>
                    <td
                      style={{
                        color:
                          typeof account.change24h === 'number' && account.change24h >= 0
                            ? 'var(--success)'
                            : 'var(--warning)'
                      }}
                    >
                      {typeof account.change24h === 'number' && account.change24h >= 0 ? '+' : ''}
                      {typeof account.change24h === 'number' ? account.change24h : '0'}%
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No accounts yet. Create one through the middleware to see balances here.
                    </td>
                  </tr>
                )}
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
                      {quest.progress}/{quest.target}
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
                        width: `${Math.min(1, quest.progress / quest.target) * 100}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'var(--accent-gradient)'
                      }}
                    />
                  </div>
                </li>
              ))}
              {quests.length === 0 && (
                <li className="card dense" style={{ color: 'var(--text-muted)' }}>
                  Complete onboarding to unlock your first quest.
                </li>
              )}
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
            {activity.map((txn) => (
              <li key={txn.id} className="card dense" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span className="eyebrow">{new Date(txn.occurredAt).toLocaleString()}</span>
                <strong>{txn.description}</strong>
                <span style={{ color: txn.type === 'credit' ? 'var(--success)' : 'var(--warning)' }}>
                  {txn.type === 'credit' ? '+' : '-'}
                  {formatCurrency(Math.abs(txn.amount ?? 0))}
                </span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="card dense" style={{ color: 'var(--text-muted)' }}>
                No activity yet. Once transfers settle they will appear here.
              </li>
            )}
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
