import React from 'react';
import { Wallet } from 'lucide-react';

export const Login: React.FC = () => {
    const handleLogin = () => {
        // Redirect to backend auth route
        window.location.href = '/api/auth/login';
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-body)',
            padding: '2rem'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '3rem'
            }}>
                <Wallet size={48} />
                <span>Finanças</span>
            </div>

            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                padding: '3rem 2rem'
            }}>
                <h2 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Bem-vindo</h2>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    Faça login para gerenciar suas finanças de forma segura.
                </p>

                <button
                    onClick={handleLogin}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        padding: '1rem'
                    }}
                >
                    Entrar
                </button>
            </div>
        </div>
    );
};
