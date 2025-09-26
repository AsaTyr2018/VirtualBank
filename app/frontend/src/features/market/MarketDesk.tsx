import { Icon } from '../../components/ui/Icon';
import { useExperienceSnapshot } from '../../hooks/useExperienceSnapshot';
import '../../components/ui/ui.css';

const sentimentEmoji = {
  bullish: '🟢',
  neutral: '🟡',
  bearish: '🔴'
} as const;

export const MarketDesk = () => {
  const { data, isLoading, isError, error, refetch } = useExperienceSnapshot();

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Loading market desk</h2>
          <p>Subscribing to the middleware feed…</p>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Market data unavailable</h2>
          <p>We were unable to fetch live instruments from the middleware.</p>
        </div>
        <p style={{ color: 'var(--warning)' }}>{(error as Error)?.message ?? 'Unknown error'}</p>
        <button className="chip" onClick={() => refetch()}>
          Retry
          <Icon name="repeat" />
        </button>
      </section>
    );
  }

  const { market } = data;

  return (
    <div className="grid two">
      <section className="card">
        <div className="section-title">
          <div>
            <h2>Market pulse</h2>
            <p>Simulated tickers refresh every few seconds via the middleware stream.</p>
          </div>
          <div className="badge">
            <Icon name="trendUp" />
            Regime: Trend Up
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Price</th>
              <th>Δ</th>
              <th>Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {market.map((instrument) => (
              <tr key={instrument.symbol}>
                <td>
                  <strong>{instrument.symbol}</strong>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{instrument.name}</p>
                </td>
                <td>{instrument.price.toFixed(2)}</td>
                <td style={{ color: instrument.change >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                  {instrument.change >= 0 ? '+' : ''}
                  {instrument.change}%
                </td>
                <td>
                  <span className="badge">
                    {sentimentEmoji[instrument.sentiment]} {instrument.sentiment}
                  </span>
                </td>
              </tr>
            ))}
            {market.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No market orders yet. Submit one through the middleware API to populate this feed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <aside className="card dense" style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <h3>Trade ticket</h3>
          <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
            Choose order type, preview fees, and review open positions instantly.
          </p>
          <div className="grid" style={{ gap: '1rem' }}>
            <label className="input-group">
              <span>Order type</span>
              <select>
                <option>Market</option>
                <option>Limit</option>
                <option>Stop</option>
              </select>
            </label>
            <label className="input-group">
              <span>Quantity</span>
              <input type="number" min={1} defaultValue={10} />
            </label>
            <label className="input-group">
              <span>Time in force</span>
              <select>
                <option>GTC</option>
                <option>DAY</option>
                <option>FOK</option>
              </select>
            </label>
          </div>
          <button className="chip" style={{ width: 'fit-content' }}>
            Place order
            <Icon name="sparkles" />
          </button>
        </div>
        <div>
          <h3>Heatmap preview</h3>
          <div className="grid three" style={{ gap: '0.75rem' }}>
            {market.map((instrument) => (
              <div
                key={instrument.symbol}
                className="card dense"
                style={{
                  background: instrument.change >= 0 ? 'rgba(46,139,87,0.12)' : 'rgba(199,120,0,0.12)',
                  color: instrument.change >= 0 ? 'var(--success)' : 'var(--warning)'
                }}
              >
                <strong>{instrument.symbol}</strong>
                <span>
                  {instrument.change >= 0 ? '+' : ''}
                  {instrument.change}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>News ticker</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem', margin: 0 }}>
            <li className="badge">
              🟢 MemeNation unlocks neon credit line upgrades.
            </li>
            <li className="badge warning">
              🔶 VirtuQuest Labs announces surprise boss fight.
            </li>
            <li className="badge">
              🟢 BankSim Prime hits new quest milestone high.
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
