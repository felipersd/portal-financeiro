import { lazy, Suspense, useEffect, useState } from 'react';
import {
    LayoutDashboard,
    List,
    Plus,
    Tags,
    LogOut,
    Users,
    ChartNoAxesCombined,
    Bell,
    Settings2,
    ArrowLeftRight,
    Menu,
    X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Brand } from './Brand';
import { TransactionModal } from './TransactionModal';
import { MonthYearPicker } from './MonthYearPicker';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
const Dashboard = lazy(() => import('./Dashboard').then((module) => ({ default: module.Dashboard })));
const TransactionList = lazy(() =>
    import('./TransactionList').then((module) => ({ default: module.TransactionList })),
);
const MembersManager = lazy(() =>
    import('./MembersManager').then((module) => ({ default: module.MembersManager })),
);
const SharingCenter = lazy(() =>
    import('./SharingCenter').then((module) => ({ default: module.SharingCenter })),
);
const MonthlyReport = lazy(() =>
    import('./MonthlyReport').then((module) => ({ default: module.MonthlyReport })),
);
const Organization = lazy(() =>
    import('./Organization').then((module) => ({ default: module.Organization })),
);
const ProfileSettings = lazy(() =>
    import('./ProfileSettings').then((module) => ({ default: module.ProfileSettings })),
);
const NotificationCenter = lazy(() =>
    import('./NotificationCenter').then((module) => ({ default: module.NotificationCenter })),
);
const TermsOfService = lazy(() =>
    import('./TermsOfService').then((module) => ({ default: module.TermsOfService })),
);
const PrivacyPolicy = lazy(() =>
    import('./PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })),
);
const navigation = [
    { id: 'dashboard', label: 'Visão geral', short: 'Início', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', short: 'Extrato', icon: List },
    { id: 'sharing', label: 'Compartilhamentos', short: 'Dividir', icon: ArrowLeftRight },
    { id: 'reports', label: 'Relatórios', short: 'Relatórios', icon: ChartNoAxesCombined },
    { id: 'members', label: 'Membros', short: 'Membros', icon: Users },
    { id: 'organization', label: 'Organização', short: 'Organizar', icon: Tags },
];
const views = [
    'dashboard',
    'transactions',
    'sharing',
    'reports',
    'members',
    'organization',
    'settings',
    'notifications',
    'terms',
    'privacy',
];
function activeView() {
    const hash = window.location.hash.slice(1);
    return views.includes(hash) ? hash : 'dashboard';
}

export function Layout() {
    const { user, logout, sharing, notifications } = useFinance();
    const [view, setView] = useState(activeView);
    const [modal, setModal] = useState(false);
    const [menu, setMenu] = useState(false);
    useEffect(() => {
        const changed = () => {
            setView(activeView());
            setMenu(false);
        };
        window.addEventListener('hashchange', changed);
        return () => window.removeEventListener('hashchange', changed);
    }, []);
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [view]);
    const go = (target: string) => {
        window.location.hash = target;
        setView(target);
        setMenu(false);
    };
    const title =
        navigation.find((item) => item.id === view)?.label ||
        (
            {
                settings: 'Minha conta',
                notifications: 'Notificações',
                terms: 'Termos de uso',
                privacy: 'Privacidade',
            } as Record<string, string>
        )[view];
    const content = () => {
        switch (view) {
            case 'transactions':
                return <TransactionList />;
            case 'sharing':
                return <SharingCenter />;
            case 'members':
                return <MembersManager />;
            case 'organization':
                return <Organization />;
            case 'reports':
                return <MonthlyReport />;
            case 'settings':
                return <ProfileSettings />;
            case 'notifications':
                return <NotificationCenter />;
            case 'terms':
                return <TermsOfService />;
            case 'privacy':
                return <PrivacyPolicy />;
            default:
                return <Dashboard />;
        }
    };
    const navItems = navigation.map(({ id, label, icon: Icon }) => (
        <a
            key={id}
            href={`#${id}`}
            className={`nav-item ${view === id ? 'active' : ''}`}
            aria-current={view === id ? 'page' : undefined}
        >
            <Icon size={19} />
            <span>{label}</span>
            {id === 'sharing' && (sharing.attentionCount || 0) > 0 && (
                <span className="nav-count">{sharing.attentionCount}</span>
            )}
        </a>
    ));
    return (
        <div className="app-container">
            <a
                href="#main-content"
                className="skip-link"
                onClick={(event) => {
                    event.preventDefault();
                    document.getElementById('main-content')?.focus();
                }}
            >
                Pular para o conteúdo
            </a>
            <CookieConsent />
            <aside className="sidebar">
                <a href="#dashboard" className="brand-link">
                    <Brand />
                </a>
                <span className="nav-section-label">MINHAS FINANÇAS</span>
                <nav aria-label="Navegação principal">{navItems}</nav>
                <div className="sidebar-bottom">
                    <a href="#settings" className={`nav-item ${view === 'settings' ? 'active' : ''}`}>
                        <Settings2 size={19} /> Minha conta
                    </a>
                    <div className="sidebar-divider" />
                    <button className="profile-trigger" onClick={() => go('settings')}>
                        <span className="avatar">
                            {user?.avatar ? <img src={user.avatar} alt="" /> : user?.name.slice(0, 1)}
                        </span>
                        <span>
                            <strong>{user?.name}</strong>
                            <small>Perfil e preferências</small>
                        </span>
                    </button>
                    <button className="nav-item logout" onClick={logout}>
                        <LogOut size={17} /> Sair da conta
                    </button>
                </div>
            </aside>
            <main className="main-content" id="main-content" tabIndex={-1}>
                <header className="top-bar">
                    <div className="top-title">
                        <span className="show-mobile">
                            <Brand compact />
                        </span>
                        <h1>{title}</h1>
                    </div>
                    <div className="top-actions">
                        <button
                            className="notification-button icon-btn"
                            aria-label={`Notificações, ${notifications.unread} não lidas`}
                            onClick={() => go('notifications')}
                        >
                            <Bell size={20} />
                            {notifications.unread > 0 && <span />}
                        </button>
                        <button
                            aria-label="Novo lançamento"
                            className="btn-primary new-transaction"
                            onClick={() => setModal(true)}
                        >
                            <Plus size={18} />
                            <span>Novo lançamento</span>
                        </button>
                        <button
                            className="show-mobile icon-btn"
                            aria-label={menu ? 'Fechar navegação' : 'Mais opções'}
                            aria-expanded={menu}
                            onClick={() => setMenu(!menu)}
                        >
                            {menu ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </header>
                {menu && (
                    <nav className="mobile-more show-mobile" aria-label="Mais opções">
                        {navItems}
                        <a href="#settings" className="nav-item">
                            <Settings2 size={19} /> Minha conta
                        </a>
                        <button className="nav-item" onClick={logout}>
                            <LogOut size={19} /> Sair
                        </button>
                    </nav>
                )}
                <div className="content-area">
                    <div className="period-row">
                        <span>
                            {['dashboard', 'transactions', 'reports', 'sharing'].includes(view)
                                ? 'Período de referência'
                                : 'Seu espaço pessoal'}
                        </span>
                        {['dashboard', 'transactions', 'reports', 'sharing'].includes(view) && (
                            <MonthYearPicker />
                        )}
                    </div>
                    <Suspense
                        fallback={
                            <div role="status" className="card">
                                Carregando seu espaço…
                            </div>
                        }
                    >
                        {content()}
                    </Suspense>
                    <Footer onNavigate={go} />
                </div>
            </main>
            <nav className="bottom-nav" aria-label="Navegação móvel">
                {navigation.slice(0, 4).map(({ id, short, icon: Icon }) => (
                    <a
                        key={id}
                        href={`#${id}`}
                        className={`nav-item-mobile ${view === id ? 'active' : ''}`}
                        aria-current={view === id ? 'page' : undefined}
                    >
                        <Icon size={21} />
                        <span>{short}</span>
                    </a>
                ))}
                <button
                    className={`nav-item-mobile ${menu ? 'active' : ''}`}
                    onClick={() => setMenu(!menu)}
                    aria-expanded={menu}
                >
                    <Menu size={21} />
                    <span>Mais</span>
                </button>
            </nav>
            <TransactionModal isOpen={modal} onClose={() => setModal(false)} />
        </div>
    );
}
