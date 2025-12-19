import { useEffect } from 'react';
import { FinanceProvider } from './context/FinanceProvider';
import { Layout } from './components/Layout';
import { Logger } from './utils/Logger';

function App() {
  useEffect(() => {
    Logger.info('Frontend Application Started', {
      environment: import.meta.env.MODE,
      userAgent: navigator.userAgent
    });
  }, []);

  return (
    <FinanceProvider>
      <Layout />
    </FinanceProvider>
  );
}

export default App;
