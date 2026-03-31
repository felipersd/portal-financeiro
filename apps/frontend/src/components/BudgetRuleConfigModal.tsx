import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import type { BudgetDivision } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface BudgetRuleConfigModalProps {
    onClose: () => void;
}

export const BudgetRuleConfigModal: React.FC<BudgetRuleConfigModalProps> = ({ onClose }) => {
    const { budgetRule, updateBudgetRule, categories, selectedDate } = useFinance();
    
    const [divisions, setDivisions] = useState<BudgetDivision[]>(budgetRule?.divisions || []);
    const [mapping, setMapping] = useState<Record<string, string>>(budgetRule?.mapping ?? {});

    const generateColor = () => {
        const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6'];
        const existingColors = divisions.map(d => d.color);
        const available = colors.filter(c => !existingColors.includes(c));
        return available.length > 0 ? available[0] : colors[Math.floor(Math.random() * colors.length)];
    };

    const handlePercentageChange = (id: string, val: number) => {
        setDivisions(prev => prev.map(d => d.id === id ? { ...d, percentage: val } : d));
    };

    const handleNameChange = (id: string, name: string) => {
        setDivisions(prev => prev.map(d => d.id === id ? { ...d, name } : d));
    };

    const handleAddDivision = () => {
        if (divisions.length >= 10) return;
        const newId = `div-${Date.now()}`;
        setDivisions(prev => [...prev, { id: newId, name: `Nova Categoria`, percentage: 0, color: generateColor() }]);
    };

    const handleRemoveDivision = (id: string) => {
        if (divisions.length <= 1) return;
        setDivisions(prev => prev.filter(d => d.id !== id));
        // Remove mappings for deleted division
        setMapping(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(cat => {
                if (next[cat] === id) {
                    delete next[cat];
                }
            });
            return next;
        });
    };

    const handleMappingChange = (categoryName: string, divisionId: string) => {
        setMapping(prev => ({ ...prev, [categoryName]: divisionId }));
    };

    const total = divisions.reduce((acc, div) => acc + div.percentage, 0);

    const handleSave = async () => {
        if (total !== 100) {
            return;
        }

        const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        await updateBudgetRule(monthStr, { divisions, mapping });
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
                boxShadow: 'var(--shadow-lg)', touchAction: 'pan-y', padding: '1.5rem', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem',
                    position: 'sticky', top: '-1.5rem', background: 'var(--surface)', zIndex: 10, padding: '1.5rem 0 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Configurar Regra</h2>
                    <span style={{ 
                        fontWeight: 'bold', 
                        color: total === 100 ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: total === 100 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '2rem',
                        fontSize: '0.875rem',
                        boxShadow: `0 0 10px ${total === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        transition: 'all 0.3s'
                    }}>
                        Total: {total}%
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', width: '32px', height: '32px', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', padding: 0 }} title="Fechar">&times;</button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {divisions.map((div) => (
                            <div key={div.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: div.color }} />
                                        <input
                                            type="text"
                                            value={div.name}
                                            onChange={(e) => handleNameChange(div.id, e.target.value)}
                                            style={{ 
                                                background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                                                color: 'var(--text-primary)', outline: 'none', padding: '0.25rem', fontSize: '0.875rem', flex: 1,
                                                borderRadius: 0
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 600, minWidth: '3ch', textAlign: 'right' }}>{div.percentage}%</span>
                                        <button 
                                            onClick={() => handleRemoveDivision(div.id)}
                                            disabled={divisions.length <= 1}
                                            style={{ 
                                                background: 'transparent', border: 'none', cursor: divisions.length <= 1 ? 'not-allowed' : 'pointer', 
                                                color: divisions.length <= 1 ? 'rgba(255,255,255,0.1)' : 'var(--danger)', padding: '0.25rem',
                                                display: 'flex'
                                            }}
                                            title="Remover Divisão"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <input 
                                    type="range" min="0" max="100" value={div.percentage} 
                                    onChange={(e) => handlePercentageChange(div.id, Number(e.target.value))} 
                                    style={{ width: '100%', accentColor: div.color }} 
                                />
                            </div>
                        ))}
                    </div>

                    {divisions.length >= 10 && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem', fontStyle: 'italic' }}>
                            Você atingiu o limite de 10 categorias de orçamento para facilitar o acompanhamento.
                        </div>
                    )}

                    {divisions.length < 10 && (
                        <button 
                            className="btn-secondary" 
                            onClick={handleAddDivision}
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderStyle: 'dashed' }}
                        >
                            <Plus size={18} /> Adicionar Nova Divisão
                        </button>
                    )}
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Mapeamento de Categorias</h3>
                    <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Defina em qual fatia da regra cada categoria se encaixa. Mudanças feitas aqui valem para o mês atual em diante.
                    </p>
                    
                    {expenseCategories.length === 0 && (
                        <p className="text-secondary" style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>Nenhuma categoria de despesa criada.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {expenseCategories.map(cat => {
                            // Ensure mapping always points to an existing division, effectively falling back to the first division
                            const activeMap = divisions.find(d => d.id === mapping[cat]) ? mapping[cat] : divisions[0]?.id;
                            return (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.875rem' }}>{cat}</span>
                                    <select 
                                        className="input" 
                                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        value={activeMap || ''}
                                        onChange={(e) => handleMappingChange(cat, e.target.value)}
                                    >
                                        {divisions.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ 
                    marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap-reverse', gap: '1rem',
                    position: 'sticky', bottom: '-1.5rem', background: 'var(--surface)', zIndex: 10, padding: '1rem 0 1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 -4px 12px rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        color: 'var(--danger)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        opacity: total !== 100 ? 1 : 0,
                        visibility: total !== 100 ? 'visible' : 'hidden',
                        transform: total !== 100 ? 'translateY(0)' : 'translateY(5px)',
                        transition: 'all 0.3s ease',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <span>⚠️ A soma deve ser exatamente 100%</span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button className="btn-primary" onClick={handleSave} disabled={total !== 100} style={{ opacity: total !== 100 ? 0.5 : 1, cursor: total !== 100 ? 'not-allowed' : 'pointer' }}>
                            Salvar Configurações
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
