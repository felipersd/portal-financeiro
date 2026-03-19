import React from 'react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';

export const Login: React.FC = () => {
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

            <div style={{
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                padding: '3rem 2rem',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem'
            }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Bem-vindo</h2>
                <p style={{ marginBottom: '2.5rem', color: 'var(--text-secondary)' }}>
                    Faça login ou cadastre-se para gerenciar suas finanças.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SignInButton mode="modal" fallbackRedirectUrl="/">
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', cursor: 'pointer' }}>
                            Entrar
                        </button>
                    </SignInButton>
                    
                    <SignUpButton mode="modal" fallbackRedirectUrl="/">
                        <button style={{ 
                            width: '100%', 
                            justifyContent: 'center', 
                            padding: '1rem', 
                            fontSize: '1.1rem',
                            background: 'transparent',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}>
                            Criar conta
                        </button>
                    </SignUpButton>
                </div>
            </div>
        </div>
    );
};
