import React from 'react';
import { useFinance } from '../context/FinanceContext';

export const MemberReport: React.FC = () => {
    const { members, getSummary } = useFinance();
    const { memberBalances, netBalance } = getSummary();

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '2rem' }}>Relatório Financeiro por Membro</h2>
            
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Seu Saldo Consolidado</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    O valor total que as pessoas te devem (positivo) ou que você deve a terceiros (negativo).
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: netBalance > 0 ? 'var(--success)' : netBalance < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {netBalance > 0 ? '+' : ''} R$ {netBalance.toFixed(2)}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {members.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '1rem' }}>
                        Nenhum membro adicionado para gerar relatórios. Vá em "Membros" para adicionar pessoas à sua conta.
                    </div>
                ) : (
                    members.map(member => {
                        const balance = memberBalances[member.id] || 0;
                        const isOwed = balance > 0;
                        const owes = balance < 0;
                        
                        return (
                            <div key={member.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{member.name} {member.surname}</h3>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{member.category}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        {isOwed ? 'Deve a você' : owes ? 'Você deve a' : 'Tudo quite'}
                                    </div>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        color: isOwed ? 'var(--success)' : owes ? 'var(--danger)' : 'var(--text-primary)'
                                    }}>
                                        R$ {Math.abs(balance).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
