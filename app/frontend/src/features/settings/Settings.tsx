import '../../components/ui/ui.css';
import { Icon } from '../../components/ui/Icon';

const toggles = [
  { label: 'Dark mode auto-switch', description: 'Match your OS preference instantly across sessions.' },
  { label: 'Accessibility contrast boost', description: 'Increase color contrast for key components and charts.' },
  { label: 'Weekly recap digest', description: 'Receive highlights, streak updates, and quest suggestions.' }
];

export const Settings = () => {
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Experience settings</h2>
          <p>Tune the interface, accessibility, and narrative channels to your style.</p>
        </div>
        <div className="badge">
          <Icon name="settings" />
          Personal defaults active
        </div>
      </div>
      <div className="grid two">
        <div className="card dense">
          <h3>Preferences</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
            {toggles.map((toggle) => (
              <li key={toggle.label} className="card dense" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong>{toggle.label}</strong>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{toggle.description}</p>
                <button className="chip ghost" style={{ width: 'fit-content' }}>
                  Toggle
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card dense">
          <h3>Localization</h3>
          <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
            We support regional fun-currency names, multi-language copy, and localized market hours.
          </p>
          <label className="input-group">
            <span>Primary language</span>
            <select>
              <option>English (Default)</option>
              <option>Deutsch</option>
              <option>Español</option>
              <option>日本語</option>
            </select>
          </label>
          <label className="input-group">
            <span>Fun-currency label</span>
            <input defaultValue="FunCoin" />
          </label>
          <label className="input-group">
            <span>Regional market window</span>
            <select>
              <option>Global (24/7)</option>
              <option>Americas</option>
              <option>EMEA</option>
              <option>APAC</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
};
