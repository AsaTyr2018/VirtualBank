import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './router';

const App = () => {
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
};

export default App;
