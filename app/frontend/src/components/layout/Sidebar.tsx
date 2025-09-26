import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import '../ui/ui.css';

const navItems = [
  { to: '/onboarding', icon: 'sparkles', label: 'Onboarding' },
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/transfers', icon: 'send', label: 'Transfer Wizard' },
  { to: '/market', icon: 'market', label: 'Market Desk' },
  { to: '/console', icon: 'shield', label: 'Game Master' },
  { to: '/settings', icon: 'settings', label: 'Settings' }
] as const satisfies Array<{ to: string; icon: IconName; label: string }>;

export const Sidebar = ({ activePath }: { activePath: string }) => {
  return (
    <aside className="sidebar card">
      <div className="sidebar__header">
        <div className="sidebar__logo">VB</div>
        <div>
          <p className="eyebrow">VirtualBank</p>
          <strong>Experience Hub</strong>
        </div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`sidebar__link ${activePath === item.to ? 'active' : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="mini-card">
          <h4>Seasonal Event</h4>
          <p>Quest for 2× yield boosts in the Lunar Arcade promo.</p>
          <button className="chip">View quests</button>
        </div>
      </div>
    </aside>
  );
};
