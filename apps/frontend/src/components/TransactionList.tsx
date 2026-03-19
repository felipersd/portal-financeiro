import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Inbox, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import type { Transaction } from '../types';

const CategorySection = ({ 
    category, 
    transactions, 
    type,
    renderTransaction
}: { 
    category: string; 
    transactions: Transaction[]; 
    type: 'income' | 'expense';
    renderTransaction: (t: Transaction) => React.ReactNode;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const categoryTotal = transactions.reduce((acc, t) => {
        const amount = t.isShared && t.type === 'expense' && t.splitDetails?.splits
            ? (t.splitDetails.splits.find(s => s.memberId === 'me')?.amount || 0)
            : t.amount;
        return acc + amount;
    }, 0);

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: isExpanded ? '0.75rem' : '0',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '0.5rem',
                    transition: 'margin 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <h4 style={{ fontSize: '1rem', margin: 0 }}>
                        {category}
                    </h4>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: type === 'income' ? 'var(--success)' : 'var(--text-primary)' }}>
                    {type === 'income' ? '+' : '-'} R$ {categoryTotal.toFixed(2)}
                </div>
            </div>
            
            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {transactions.map(t => renderTransaction(t))}
                </div>
            )}
        </div>
    );
};

export const TransactionList: React.FC = () => {
    const { filteredTransactions, removeTransaction } = useFinance();
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    if (filteredTransactions.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '3rem' }}>
                <Inbox size={48} style={{ marginBottom: '1rem' }} />
                <p>Nenhuma transação encontrada.</p>
            </div>
        );
    }

    const grouped = filteredTransactions.reduce((acc, t) => {
        if (!acc[t.type]) acc[t.type] = {};
        if (!acc[t.type][t.category]) acc[t.type][t.category] = [];
        acc[t.type][t.category].push(t);
        return acc;
    }, {} as Record<string, Record<string, Transaction[]>>);

    const renderTransaction = (t: Transaction) => (
        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {t.type === 'income' ? <ArrowUpCircle size={16} className="text-success" style={{ flexShrink: 0 }} /> : <ArrowDownCircle size={16} className="text-danger" style={{ flexShrink: 0 }} />}
                    <span style={{ wordBreak: 'break-word' }}>{t.description}</span>
                    {t.isShared && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                            Compartilhado ({t.payer === 'me' ? 'Eu' : 'Cônjuge'})
                        </span>
                    )}
                    {t.recurrenceId && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                            Recorrente
                        </span>
                    )}
                </div>
                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                    {t.category}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)', textAlign: 'right' }}>
                    {t.type === 'income' ? '+' : '-'} R$ {(
                        t.isShared && t.type === 'expense' && t.splitDetails?.splits
                            ? (t.splitDetails.splits.find(s => s.memberId === 'me')?.amount || 0)
                            : t.amount
                    ).toFixed(2)}
                    {t.isShared && t.type === 'expense' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            (Total: R$ {t.amount.toFixed(2)})
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="icon-btn edit"
                        onClick={() => setEditingTransaction(t)}
                        title="Editar transação"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        className="icon-btn delete"
                        onClick={() => {
                            if (confirm('Tem certeza que deseja excluir?')) {
                                removeTransaction(t.id);
                            }
                        }}
                        title="Excluir transação"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTypeSection = (type: 'income' | 'expense', title: string, color: string) => {
        const categories = grouped[type];
        if (!categories || Object.keys(categories).length === 0) return null;

        return (
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    {title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(categories).map(([category, transactions]) => (
                        <CategorySection 
                            key={category} 
                            category={category} 
                            transactions={transactions} 
                            type={type} 
                            renderTransaction={renderTransaction} 
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderTypeSection('income', 'Receitas', 'var(--success)')}
            {renderTypeSection('expense', 'Despesas', 'var(--danger)')}

            <TransactionModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                editTransaction={editingTransaction}
            />
        </div>
    );
};
