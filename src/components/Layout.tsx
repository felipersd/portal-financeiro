import React, { useState } from 'react';
import { Wallet, LayoutDashboard, List, Scale, Plus, Tag, LogOut } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { TransactionList } from './TransactionList';
import { Settlement } from './Settlement';
import { TransactionModal } from './TransactionModal';
import { CategoryManager } from './CategoryManager';
import { MonthYearPicker } from './MonthYearPicker';
import { MobileDateSelector } from './MobileDateSelector';
import { useFinance } from '../context/FinanceContext';

type View = 'dashboard' | 'transactions' | 'settlement' | 'categories';

export const Layout: React.FC = () => {
    const { user, logout, getSummary } = useFinance();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { hasSharedTransactions } = getSummary();

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard />;
            case 'transactions': return <TransactionList />;
            case 'settlement': return <Settlement />;
            case 'categories': return <CategoryManager />;
        }
    };

    const getTitle = () => {
        switch (currentView) {
            case 'dashboard': return 'Dashboard';
            case 'transactions': return 'Transações';
            case 'settlement': return 'Acerto de Contas';
            case 'categories': return 'Categorias';
        }
    };

    return (
        <div className="app-container">
            {/* Desktop Sidebar */}
            <nav className="sidebar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem', marginTop: '1rem' }}>
                    <img src="/logo-full.png" alt="Portal Financeiro" style={{ height: '60px', maxWidth: '100%', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.2))' }} />
                </div>

                {/* User Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                    {user?.avatar && <img src={user.avatar} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={logout}>Sair</div>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <li
                        onClick={() => setCurrentView('dashboard')}
                        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </li>
                    <li
                        onClick={() => setCurrentView('transactions')}
                        className={`nav-item ${currentView === 'transactions' ? 'active' : ''}`}
                    >
                        <List size={20} /> Transações
                    </li>
                    {hasSharedTransactions && (
                        <li
                            onClick={() => setCurrentView('settlement')}
                            className={`nav-item ${currentView === 'settlement' ? 'active' : ''}`}
                        >
                            <Scale size={20} /> Acerto de Contas
                        </li>
                    )}
                    <li
                        onClick={() => setCurrentView('categories')}
                        className={`nav-item ${currentView === 'categories' ? 'active' : ''}`}
                    >
                        <Tag size={20} /> Categorias
                    </li>
                </ul>

                <button onClick={logout} className="nav-item" style={{ marginTop: 'auto', border: 'none', background: 'none', width: '100%' }}>
                    <LogOut size={20} /> Sair
                </button>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <h1 className="hide-mobile">{getTitle()}</h1>
                        <div className="hide-mobile">
                            <MonthYearPicker />
                        </div>
                    </div>


                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                        <div className="show-mobile" style={{ width: '100%' }}>
                            <MobileDateSelector />
                        </div>
                        <div className="hide-mobile">
                            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                                <Plus size={20} /> <span>Nova Transação</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="content-area">
                    {renderContent()}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="bottom-nav">
                <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`nav-item-mobile ${currentView === 'dashboard' ? 'active' : ''}`}
                >
                    <LayoutDashboard size={24} />
                    <span>Início</span>
                </button>
                <button
                    onClick={() => setCurrentView('transactions')}
                    className={`nav-item-mobile ${currentView === 'transactions' ? 'active' : ''}`}
                >
                    <List size={24} />
                    <span>Lista</span>
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="nav-item-mobile"
                    style={{ color: 'var(--primary)', marginTop: '-1.5rem' }}
                >
                    <div style={{
                        background: 'var(--primary-gradient)',
                        borderRadius: '50%',
                        padding: '1rem',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '56px',
                        height: '56px',
                        marginBottom: '0.25rem'
                    }}>
                        <Plus size={32} color="white" />
                    </div>
                    <span style={{ fontWeight: 600 }}>Novo</span>
                </button>
                {hasSharedTransactions && (
                    <button
                        onClick={() => setCurrentView('settlement')}
                        className={`nav-item-mobile ${currentView === 'settlement' ? 'active' : ''}`}
                    >
                        <Scale size={24} />
                        <span>Casal</span>
                    </button>
                )}
                <button
                    onClick={() => setCurrentView('categories')}
                    className={`nav-item-mobile ${currentView === 'categories' ? 'active' : ''}`}
                >
                    <Tag size={24} />
                    <span>Categorias</span>
                </button>
            </nav>

            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};
