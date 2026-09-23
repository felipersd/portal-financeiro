import { useModalDialog } from '../hooks/useModalDialog';
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
    const { updateCategory, isProcessing, requestError } = useFinance();
    const dialogRef = useModalDialog(isOpen && !!category);
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (category) {
                if (name !== category.name) setName(category.name);
                if (type !== category.type) setType(category.type);
            }
        } else {
            document.body.style.overflow = 'unset';
            setName('');
            setType('expense');
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, category]);

    if (!isOpen || !category) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            if (!await updateCategory(category.id, name, type)) return;
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)', overflow: 'hidden',
            touchAction: 'none', overscrollBehavior: 'none'
        }}>
            <dialog ref={dialogRef} onCancel={e => { e.preventDefault(); onClose(); }} className="card native-modal" aria-labelledby="category-heading" style={{
                width: '90%', maxWidth: '400px',
                boxShadow: 'var(--shadow-lg)', touchAction: 'pan-y'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 id="category-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={20} /> Editar Categoria
                    </h2>
                    <button aria-label="Fechar categoria" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="category-name">Nome</label>
                        <input id="category-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nome da categoria"
                        />
                    </div>

                    <div className="form-group">
                        <span id="category-type-label">Tipo</span>
                        <div role="group" aria-labelledby="category-type-label" style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" aria-pressed={type === 'expense'} onClick={() => setType('expense')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                    backgroundColor: type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                    borderColor: type === 'expense' ? 'var(--danger)' : 'var(--border)',
                                    color: type === 'expense' ? 'var(--danger)' : 'var(--text-secondary)'
                                }}
                            >
                                <ArrowDownCircle size={18} /> Despesa
                            </button>
                            <button type="button" aria-pressed={type === 'income'} onClick={() => setType('income')}
                                style={{
                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                    backgroundColor: type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    borderColor: type === 'income' ? 'var(--success)' : 'var(--border)',
                                    color: type === 'income' ? 'var(--success)' : 'var(--text-secondary)'
                                }}
                            >
                                <ArrowUpCircle size={18} /> Receita
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" disabled={isProcessing} className="btn-primary">Salvar</button>
                    </div>
                </form>
                {requestError && <p role="alert">{requestError}</p>}
            </dialog>
        </div>
    );
};
