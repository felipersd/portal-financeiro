import React, { useState, useEffect } from 'react';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('cookie-preferences') && localStorage.getItem('cookie-agreed') !== 'true';
        }
        return false;
    });
    const [showOptions, setShowOptions] = useState(false);
    const [marketingEnabled, setMarketingEnabled] = useState(true);

    useEffect(() => {
        // Migration safenet: clean old key if exists
        if (localStorage.getItem('cookie-agreed') === 'true') {
            localStorage.removeItem('cookie-agreed');
            localStorage.setItem('cookie-preferences', JSON.stringify({ essential: true, marketing: true }));
            window.dispatchEvent(new Event('cookie-preferences-updated'));
            // Since we had the old key, we migrated them to the new schema silently, no need to show banner
            setIsVisible(false);
        }
    }, []);

    const savePreferences = (marketing: boolean) => {
        const prefs = { essential: true, marketing };
        localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
        window.dispatchEvent(new Event('cookie-preferences-updated'));
        setIsVisible(false);
    };

    if (!isVisible) return null;

    if (showOptions) {
        return (
            <div className="cookie-banner" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Gerenciar Preferências</h4>
                    <button onClick={() => setShowOptions(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}>&times;</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Essenciais (Obrigatório)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Necessários para manter você logado (Clerk Auth).</div>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked disabled />
                            <span className="slider round" style={{ opacity: 0.5 }}></span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Fins de Marketing</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Serviço de anúncios (Google Ads) para monetização da plataforma.</div>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked={marketingEnabled} onChange={(e) => setMarketingEnabled(e.target.checked)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="cookie-banner-action" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                     <button onClick={() => savePreferences(false)} className="btn-secondary">
                        Rejeitar Opcionais
                    </button>
                    <button onClick={() => savePreferences(marketingEnabled)} className="btn-primary">
                        Salvar Seleção
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="cookie-banner">
            <div className="cookie-banner-content">
                <h4>Privacidade e Gestão de Cookies 🍪</h4>
                <p>
                    Nós utilizamos cookies essenciais para mantê-lo logado e cookies de marketing para exibir anúncios que financiam o projeto. Você tem o direito de concordar com os nossos termos revogando cookies de terceiros.
                    <button style={{ background:'none', border:'none', color:'var(--primary)', cursor: 'pointer', marginLeft: '0.5rem', textDecoration: 'underline', font: 'inherit', fontSize: '0.875rem' }} onClick={() => setShowOptions(true)}>
                        Ver preferências
                    </button>
                </p>
            </div>
            <div className="cookie-banner-action" style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                    onClick={() => savePreferences(false)} 
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap', width: '100%', justifyContent: 'center' }}
                >
                    Apenas Essenciais
                </button>
                <button 
                    onClick={() => savePreferences(true)} 
                    className="btn-primary"
                    style={{ whiteSpace: 'nowrap', width: '100%', justifyContent: 'center' }}
                >
                    Aceitar Todos
                </button>
            </div>
        </div>
    );
};
