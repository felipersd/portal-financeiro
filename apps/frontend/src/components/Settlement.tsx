import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { FileText } from 'lucide-react';

export const Settlement: React.FC = () => {
    const { getSummary, filteredTransactions } = useFinance();
    const { netBalance, hasSharedTransactions } = getSummary();

    const sharedExpenses = filteredTransactions.filter(t => t.isShared && t.type === 'expense');

    if (!hasSharedTransactions) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                <h2>Nenhuma transação conjunta neste período</h2>
                <p>O acerto de contas só calcula os saldos considerando transações de despesas compartilhadas com membros da sua conta.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Painel de Acerto Geral</h2>
                
                <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    margin: '1rem 0',
                    color: netBalance > 0 ? 'var(--success)' : netBalance < 0 ? 'var(--danger)' : 'var(--text-primary)'
                }}>
                    R$ {Math.abs(netBalance).toFixed(2)}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    {netBalance > 0
                        ? 'Você tem valores totais a receber dos seus membros.'
                        : netBalance < 0
                            ? 'Você tem valores abertos que deve transferir para seus membros.'
                            : 'Todas as despesas compartilhadas estão perfeitamente equilibradas!'}
                </p>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Acesse a aba <strong>"Relatórios"</strong> para ver quem deve quem individualmente.
                </p>
            </div>

            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Histórico de Despesas Conjuntas</h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {sharedExpenses.map(t => (
                        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.description}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                                        {new Date(t.date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                R$ {t.amount.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
