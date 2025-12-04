import React from 'react';
import { useFinance } from '../context/FinanceContext';

export const Settlement: React.FC = () => {
    const { getSummary } = useFinance();
    const summary = getSummary();

    const balanceText = summary.netBalance === 0
        ? "Tudo zerado! Ninguém deve nada."
        : summary.netBalance > 0
            ? `O Cônjuge deve pagar a você`
            : `Você deve pagar ao Cônjuge`;

    const amount = Math.abs(summary.netBalance).toFixed(2);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div className="card" style={{ width: '100%', textAlign: 'center', padding: '2rem' }}>
                <h2>Resumo do Mês</h2>
                <div style={{ fontSize: '1.5rem', margin: '1.5rem 0', padding: '1.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Resultado Final</p>
                    {balanceText} <br />
                    <span style={{ fontSize: '3rem', fontWeight: 800 }}>R$ {amount}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left', marginTop: '2rem' }}>
                    <div>
                        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Você pagou (Compartilhado)</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>R$ {summary.mePaidShared.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Cônjuge pagou (Compartilhado)</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>R$ {summary.spousePaidShared.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ width: '100%', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Como funciona o cálculo?</h3>
                <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                    Somamos tudo que foi marcado como <strong>"Dividir com Cônjuge"</strong>.<br />
                    Se você pagou R$ 100,00, o cônjuge te deve R$ 50,00.<br />
                    Se o cônjuge pagou R$ 100,00, você deve R$ 50,00 a ele.<br />
                    No final, subtraímos um do outro para ver a diferença.
                </p>
            </div>
        </div>
    );
};
