import '../../components/ui/ui.css';
import { Icon } from '../../components/ui/Icon';

const levers = [
  {
    title: 'Economy pulse',
    description: 'Monitor money velocity, lending ratio, and vault liquidity.',
    indicator: '+12% flow'
  },
  {
    title: 'Event orchestration',
    description: 'Schedule quests, trigger double-yield weekends, and broadcast story beats.',
    indicator: '3 live events'
  },
  {
    title: 'Safeguards',
    description: 'Review flagged transfers, approve overrides, and manage cooldowns.',
    indicator: '2 pending'
  }
];

const healthItems = [
  { message: '✅ No anomalies detected in last 12 hours', tone: 'success' as const },
  { message: '⚠️ One vault hitting stress thresholds', tone: 'warning' as const },
  { message: '✅ Stockmarket latency nominal', tone: 'success' as const }
];

export const GameMasterConsole = () => {
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Game Master console</h2>
          <p>Power tools to keep the virtual economy vibrant, fair, and wildly fun.</p>
        </div>
        <div className="badge warning">
          <Icon name="shield" />
          Dual approval active
        </div>
      </div>
      <div className="grid three">
        {levers.map((lever) => (
          <article key={lever.title} className="card dense">
            <div className="tag">
              <Icon name="shield" />
              Control lever
            </div>
            <h3>{lever.title}</h3>
            <p>{lever.description}</p>
            <strong>{lever.indicator}</strong>
            <button className="chip ghost" style={{ width: 'fit-content' }}>
              Open panel
              <Icon name="arrowRight" />
            </button>
          </article>
        ))}
      </div>
      <div className="card dense" style={{ marginTop: '2rem' }}>
        <h3>Community health feed</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
          {healthItems.map((item) => (
            <li key={item.message} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${item.tone === 'warning' ? 'warning' : 'success'}`}>
                <Icon name={item.tone === 'warning' ? 'flame' : 'check'} />
              </span>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
