import { FinanceProvider } from './context/FinanceProvider';
import { Layout } from './components/Layout';

function App() {
  return (
    <FinanceProvider>
      <Layout />
    </FinanceProvider>
  );
}

export default App;
