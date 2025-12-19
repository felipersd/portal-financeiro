import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import App from './App';

// Mock dependencies
vi.mock('./context/FinanceProvider', () => ({
    FinanceProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="finance-provider">{children}</div>
}));

vi.mock('./components/Layout', () => ({
    Layout: () => <div data-testid="layout">Layout Component</div>
}));

vi.mock('./utils/Logger', () => ({
    Logger: {
        info: vi.fn()
    }
}));

describe('App Component', () => {
    it('should render Layout wrapped in FinanceProvider', () => {
        render(<App />);

        expect(screen.getByTestId('finance-provider')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
});
