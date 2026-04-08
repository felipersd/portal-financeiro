import React from 'react';

interface FooterProps {
    onNavigate: (view: 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    return (
        <footer style={{
            marginTop: '3rem',
            padding: '2rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            textAlign: 'center'
        }}>
            <div>
                © {new Date().getFullYear()} Portal Financeiro. Todos os direitos reservados.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                    onClick={() => onNavigate('terms')} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                >
                    Termos de Uso
                </button>
                <button 
                    onClick={() => onNavigate('privacy')} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                >
                    Política de Privacidade
                </button>
            </div>
        </footer>
    );
};
