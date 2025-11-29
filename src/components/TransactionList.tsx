import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Inbox, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2 } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import type { Transaction } from '../types';

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredTransactions.map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {t.type === 'income' ? <ArrowUpCircle size={16} className="text-success" /> : <ArrowDownCircle size={16} className="text-danger" />}
                            {t.description}
                            {t.isShared && (
                                <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px' }}>
                                    Compartilhado ({t.payer === 'me' ? 'Eu' : 'Cônjuge'})
                                </span>
                            )}
                            {t.recurrenceId && (
                                <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px' }}>
                                    Recorrente
                                </span>
                            )}
                        </span>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                            {t.category}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: t.type === 'income' ? 'var(--success)' : 'var(--text-primary)', textAlign: 'right' }}>
                            {t.type === 'income' ? '+' : '-'} R$ {(t.isShared && t.type === 'expense' ? t.amount / 2 : t.amount).toFixed(2)}
                            {t.isShared && t.type === 'expense' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                    (Total: R$ {t.amount.toFixed(2)})
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setEditingTransaction(t)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Tem certeza que deseja excluir?')) {
                                        removeTransaction(t.id);
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            <TransactionModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                editTransaction={editingTransaction}
            />
        </div>
    );
};
