import React, { useState, useEffect } from 'react';
import { X, Tag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Category } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
}

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose, category }) => {
    const { updateCategory } = useFinance();
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (category) {
                setName(category.name);
                setType(category.type);
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, category]);

    if (!isOpen || !category) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            await updateCategory(category.id, name, type);
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)', overflow: 'hidden',
            touchAction: 'none', overscrollBehavior: 'contain'
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={20} /> Editar Categoria
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nome da categoria"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Tipo</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div
                                onClick={() => setType('expense')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                    backgroundColor: type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                    borderColor: type === 'expense' ? 'var(--danger)' : 'var(--border)',
                                    color: type === 'expense' ? 'var(--danger)' : 'var(--text-secondary)'
                                }}
                            >
                                <ArrowDownCircle size={18} /> Despesa
                            </div>
                            <div
                                onClick={() => setType('income')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                    backgroundColor: type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    borderColor: type === 'income' ? 'var(--success)' : 'var(--border)',
                                    color: type === 'income' ? 'var(--success)' : 'var(--text-secondary)'
                                }}
                            >
                                <ArrowUpCircle size={18} /> Receita
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
