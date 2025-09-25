import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { SearchBar } from '../ui/SearchBar';
import '../ui/ui.css';

const routeTitles: Record<string, string> = {
  '/onboarding': 'Welcome Journey',
  '/dashboard': 'Player Control Center',
  '/transfers': 'Transfer Wizard',
  '/market': 'Market Desk',
  '/console': 'Game Master Console',
  '/settings': 'Experience Settings'
};

export const Header = () => {
  const { pathname } = useLocation();

  const subtitle = useMemo(() => {
    switch (pathname) {
      case '/onboarding':
        return 'Set up your playful finances with guided steps.';
      case '/dashboard':
        return 'Real-time snapshot of balances, goals, and community vibes.';
      case '/transfers':
        return 'Send fun-currency with clarity and delightful confirmations.';
      case '/market':
        return 'Track markets, trade instantly, and celebrate epic gains.';
      case '/console':
        return 'Tune the economy, orchestrate events, and monitor community health.';
      case '/settings':
        return 'Personalize accessibility, notifications, and theming.';
      default:
        return 'VirtualBank keeps the magic of money playful and transparent.';
    }
  }, [pathname]);

  const title = routeTitles[pathname] ?? 'VirtualBank Experience';

  return (
    <header className="header">
      <div>
        <div className="eyebrow">VirtualBank</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header__actions">
        <SearchBar placeholder="Search accounts, quests, or friends" />
        <button className="chip ghost">
          <Icon name="bell" />
          Alerts
        </button>
        <Avatar name="Riley Quartz" status="Game Master" />
      </div>
    </header>
  );
};
