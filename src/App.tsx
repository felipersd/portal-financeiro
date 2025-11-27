import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';

function App() {
  return (
    <FinanceProvider>
      <Layout />
    </FinanceProvider>
  );
}

export default App;
