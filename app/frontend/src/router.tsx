import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './features/dashboard/Dashboard';
import { Onboarding } from './features/onboarding/Onboarding';
import { TransferWizard } from './features/transfers/TransferWizard';
import { MarketDesk } from './features/market/MarketDesk';
import { GameMasterConsole } from './features/admin/GameMasterConsole';
import { Settings } from './features/settings/Settings';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transfers" element={<TransferWizard />} />
      <Route path="/market" element={<MarketDesk />} />
      <Route path="/console" element={<GameMasterConsole />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
