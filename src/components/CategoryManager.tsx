import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Trash2, Plus, Tag } from 'lucide-react';

export const CategoryManager: React.FC = () => {
    const { categories, addCategory, removeCategory } = useFinance();
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCatName.trim()) {
            await addCategory(newCatName, newCatType);
            setNewCatName('');
        }
    };

    return (
        <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Tag size={24} className="text-primary" /> Gerenciar Categorias
            </h2>

            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Nova categoria..."
                    style={{ flex: 2, minWidth: '200px' }}
                />
                <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value as any)}
                    style={{ flex: 1, minWidth: '120px' }}
                >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                </select>
                <button type="submit" className="btn-primary">
                    <Plus size={20} /> Adicionar
                </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {categories.map(cat => (
                    <div key={cat.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1rem', backgroundColor: 'var(--bg-body)', borderRadius: '0.5rem', border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                backgroundColor: cat.type === 'income' ? 'var(--success)' : 'var(--danger)'
                            }}></div>
                            <span>{cat.name}</span>
                        </div>
                        <button
                            onClick={() => removeCategory(cat.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
