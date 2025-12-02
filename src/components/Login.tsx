import React from 'react';


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
            <div style={{ marginBottom: '2rem' }}>
                <img src="/logo-full.png?v=3" alt="Portal Financeiro" style={{ height: '160px', maxWidth: '100%', filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))' }} />
            </div>

            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                padding: '3rem 2rem',
                background: 'rgba(30, 41, 59, 0.7)', // Semi-transparent
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Bem-vindo</h2>
                <p style={{ marginBottom: '2.5rem', color: 'var(--text-secondary)' }}>
                    Faça login para gerenciar suas finanças.
                </p>

                <button
                    onClick={handleLogin}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        padding: '1rem',
                        boxShadow: 'var(--shadow-glow)'
                    }}
                >
                    Entrar
                </button>
            </div>
        </div>
    );
};
