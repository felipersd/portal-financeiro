import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';

interface BudgetRuleConfigModalProps {
    onClose: () => void;
}

export const BudgetRuleConfigModal: React.FC<BudgetRuleConfigModalProps> = ({ onClose }) => {
    const { budgetRule, updateBudgetRule, categories, selectedDate } = useFinance();
    
    // Sliders state
    const [needs, setNeeds] = useState(50);
    const [wants, setWants] = useState(30);
    const [savings, setSavings] = useState(20);

    // Mapping state
    const [mapping, setMapping] = useState<Record<string, 'needs' | 'wants' | 'savings'>>({});

    useEffect(() => {
        if (budgetRule) {
            setNeeds(budgetRule.needsPct);
            setWants(budgetRule.wantsPct);
            setSavings(budgetRule.savingsPct);
            setMapping(budgetRule.mapping);
        }
    }, [budgetRule]);

    const handlePercentageChange = (type: 'needs' | 'wants' | 'savings', val: number) => {
        if (type === 'needs') setNeeds(val);
        if (type === 'wants') setWants(val);
        if (type === 'savings') setSavings(val);
    };

    const handleMappingChange = (categoryName: string, bucket: 'needs' | 'wants' | 'savings') => {
        setMapping(prev => ({ ...prev, [categoryName]: bucket }));
    };

    const handleSave = async () => {
        const total = needs + wants + savings;
        if (total !== 100) {
            alert(`As porcentagens devem somar 100%. Total atual: ${total}%`);
            return;
        }

        const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        await updateBudgetRule(monthStr, { needsPct: needs, wantsPct: wants, savingsPct: savings, mapping });
        onClose();
    };

    const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

    if (!budgetRule) return null;

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)', overflow: 'hidden',
            touchAction: 'none', overscrollBehavior: 'none'
        }}>
            <div className="card" style={{
                width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)', touchAction: 'pan-y', padding: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Configurar Regra de Orçamento</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', display: 'flex' }}>&times;</button>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Divisão da Renda ({needs + wants + savings}%)</h3>
                    
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label>Necessidades</label>
                            <span>{needs}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={needs} onChange={(e) => handlePercentageChange('needs', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label>Desejos</label>
                            <span>{wants}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={wants} onChange={(e) => handlePercentageChange('wants', Number(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label>Poupança / Investimentos</label>
                            <span>{savings}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={savings} onChange={(e) => handlePercentageChange('savings', Number(e.target.value))} style={{ width: '100%', accentColor: '#8b5cf6' }} />
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Mapeamento de Categorias</h3>
                    <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Defina em qual fatia da regra cada categoria de despesa se encaixa. Mudanças feitas aqui valem para o mês atual em diante.
                    </p>
                    
                    {expenseCategories.length === 0 && (
                        <p className="text-secondary" style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>Nenhuma categoria de despesa criada.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {expenseCategories.map(cat => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.875rem' }}>{cat}</span>
                                <select 
                                    className="input" 
                                    style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                    value={mapping[cat] || 'needs'}
                                    onChange={(e) => handleMappingChange(cat, e.target.value as 'needs'|'wants'|'savings')}
                                >
                                    <option value="needs">Necessidade</option>
                                    <option value="wants">Desejo</option>
                                    <option value="savings">Poupança/Invest.</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={needs + wants + savings !== 100}>
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
