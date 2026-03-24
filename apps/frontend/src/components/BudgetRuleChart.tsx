import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { BudgetRuleConfigModal } from './BudgetRuleConfigModal';

export const BudgetRuleChart: React.FC = () => {
    const { budgetRule, filteredTransactions, getSummary } = useFinance();
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    if (!budgetRule) return null;

    const summary = getSummary();
    const totalIncome = summary.totalIncome;

    const actuals = { needs: 0, wants: 0, savings: 0 };

    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
        let amount = t.amount;
        if (t.isShared && t.splitDetails?.splits) {
            const meSplit = t.splitDetails.splits.find((s: { memberId: string; amount: number }) => s.memberId === 'me');
            if (meSplit) amount = meSplit.amount;
            else amount = 0;
        }

        const bucket = budgetRule.mapping[t.category];
        if (bucket === 'needs') actuals.needs += amount;
        else if (bucket === 'wants') actuals.wants += amount;
        else if (bucket === 'savings') actuals.savings += amount;
    });

    const renderBar = (title: string, actual: number, targetPct: number, color: string) => {
        const targetAmount = totalIncome * (targetPct / 100);
        const overspent = actual > targetAmount;
        const fillPct = targetAmount === 0 ? (actual > 0 ? 100 : 0) : Math.min((actual / targetAmount) * 100, 100);
        
        return (
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600 }}>{title} ({targetPct}%)</span>
                    <span>
                        <span style={{ color: overspent ? 'var(--danger)' : 'inherit' }}>R$ {actual.toFixed(2)}</span>
                        <span className="text-secondary"> / R$ {targetAmount.toFixed(2)}</span>
                    </span>
                </div>
                <div style={{ width: '100%', height: '12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                        height: '100%', 
                        width: `${fillPct}%`, 
                        backgroundColor: overspent ? 'var(--danger)' : color,
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        );
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                        Metas de Orçamento
                    </h2>
                    <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Proporção ativa: {budgetRule.needsPct}% / {budgetRule.wantsPct}% / {budgetRule.savingsPct}%
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={() => setIsConfigOpen(true)}>
                    ⚙️ Configurar
                </button>
            </div>

            {totalIncome === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                    Adicione receitas neste mês para visualizar as metas da regra.
                </div>
            ) : (
                <div>
                    {renderBar('Necessidades', actuals.needs, budgetRule.needsPct, '#10b981')}
                    {renderBar('Desejos', actuals.wants, budgetRule.wantsPct, '#3b82f6')}
                    {renderBar('Poupança / Invest', actuals.savings, budgetRule.savingsPct, '#8b5cf6')}
                </div>
            )}

            {isConfigOpen && (
                <BudgetRuleConfigModal onClose={() => setIsConfigOpen(false)} />
            )}
        </div>
    );
};
