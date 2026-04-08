import React, { useState } from 'react';
import { LayoutDashboard, List, Scale, Plus, Tag, LogOut, Users, PieChart } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { TransactionList } from './TransactionList';
import { Settlement } from './Settlement';
import { TransactionModal } from './TransactionModal';
import { CategoryManager } from './CategoryManager';
import { MonthYearPicker } from './MonthYearPicker';
import { MobileDateTrigger, MobileDateCarousel } from './MobileDateSelector';
import { MemberReport } from './MemberReport';
import { MembersManager } from './MembersManager';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { useFinance } from '../context/FinanceContext';

type View = 'dashboard' | 'transactions' | 'settlement' | 'categories' | 'members' | 'reports' | 'terms' | 'privacy';

export const Layout: React.FC = () => {
    const { user, logout, getSummary } = useFinance();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobileDateExpanded, setIsMobileDateExpanded] = useState(false);

    const { hasSharedTransactions } = getSummary();

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard />;
            case 'transactions': return <TransactionList />;
            case 'settlement': return <Settlement />;
            case 'categories': return <CategoryManager />;
            case 'members': return <MembersManager />;
            case 'reports': return <MemberReport />;
            case 'terms': return <TermsOfService />;
            case 'privacy': return <PrivacyPolicy />;
        }
    };

    const getTitle = () => {
        switch (currentView) {
            case 'dashboard': return 'Dashboard';
            case 'transactions': return 'Transações';
            case 'settlement': return 'Acerto de Contas';
            case 'categories': return 'Categorias';
            case 'members': return 'Membros';
            case 'reports': return 'Relatórios';
            case 'terms': return 'Termos de Uso';
            case 'privacy': return 'Política de Privacidade';
        }
    };

    return (
        <div className="app-container">
            <CookieConsent />
            {/* Desktop Sidebar */}
            <nav className="sidebar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    <img src="/logo-full.png?v=3" alt="Portal Financeiro" style={{ height: '70px', maxWidth: '100%', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.2))' }} />
                </div>

                {/* User Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                    {user?.avatar && <img src={user.avatar} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />}
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={logout}>Sair</div>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '0.5rem', marginRight: '-0.5rem' }}>
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
                    <li
                        onClick={() => setCurrentView('members')}
                        className={`nav-item ${currentView === 'members' ? 'active' : ''}`}
                    >
                        <Users size={20} /> Membros
                    </li>
                    <li
                        onClick={() => setCurrentView('reports')}
                        className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
                    >
                        <PieChart size={20} /> Relatórios
                    </li>
                </ul>

                <button onClick={logout} className="nav-item" style={{ marginTop: '0.5rem', border: 'none', background: 'none', width: '100%', flexShrink: 0 }}>
                    <LogOut size={20} /> Sair
                </button>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar" style={{ flexDirection: 'column', padding: 0, gap: 0, height: 'auto' }}>
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.5rem 2rem',
                        position: 'relative'
                    }}>
                        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <h1>{getTitle()}</h1>
                            <MonthYearPicker />
                        </div>

                        {/* Mobile Logo - Left */}
                        <div className="show-mobile" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}>
                            <img src="/logo-icon.png" alt="Logo" style={{ height: '60px', width: 'auto' }} />
                        </div>

                        {/* Mobile Date Trigger - Centered */}
                        <div className="show-mobile" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                            <MobileDateTrigger isExpanded={isMobileDateExpanded} onToggle={() => setIsMobileDateExpanded(!isMobileDateExpanded)} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', zIndex: 50 }}>
                            {/* Mobile Profile Menu */}
                            <div
                                className="show-mobile"
                                style={{ position: 'relative', marginLeft: '0.25rem' }}
                            >
                                <div
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '2px',
                                        border: isProfileMenuOpen ? '2px solid var(--primary)' : '2px solid transparent',
                                        borderRadius: '50%',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <img
                                        src={user?.avatar || '/avatar-vazio.png'}
                                        alt="Avatar"
                                        style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'block', objectFit: 'cover' }}
                                    />
                                </div>

                                {isProfileMenuOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '120%',
                                            right: 0,
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.5rem',
                                            minWidth: '150px',
                                            boxShadow: 'var(--shadow-lg)',
                                            zIndex: 50,
                                            animation: 'fadeIn 0.2s ease-out'
                                        }}>
                                            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</div>
                                            </div>
                                            <button
                                                onClick={logout}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--danger)',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                <LogOut size={16} />
                                                Sair
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="hide-mobile">
                                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                                    <Plus size={20} /> <span>Nova Transação</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Date Carousel - Expandable Row */}
                    <div className="show-mobile" style={{ width: '100%' }}>
                        <MobileDateCarousel isExpanded={isMobileDateExpanded} />
                    </div>
                </header>

                <div className="content-area">
                    {renderContent()}
                    <Footer onNavigate={(view) => setCurrentView(view)} />
                </div>
            </main>

            {/* Mobile Floating Action Button */}
            <button
                className="show-mobile"
                onClick={() => setIsModalOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                    cursor: 'pointer',
                    zIndex: 90
                }}
            >
                <Plus size={32} />
            </button>

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
                {hasSharedTransactions && (
                    <button
                        onClick={() => setCurrentView('settlement')}
                        className={`nav-item-mobile ${currentView === 'settlement' ? 'active' : ''}`}
                    >
                        <Scale size={24} />
                        <span>Acertos</span>
                    </button>
                )}
                <button
                    onClick={() => setCurrentView('categories')}
                    className={`nav-item-mobile ${currentView === 'categories' ? 'active' : ''}`}
                >
                    <Tag size={24} />
                    <span>Categorias</span>
                </button>
                <button
                    onClick={() => setCurrentView('members')}
                    className={`nav-item-mobile ${currentView === 'members' ? 'active' : ''}`}
                >
                    <Users size={24} />
                    <span>Membros</span>
                </button>
            </nav>

            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};
