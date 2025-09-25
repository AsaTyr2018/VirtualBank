import { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './layout.css';

export const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Sidebar activePath={location.pathname} />
      <div className="app-shell__content">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
};
