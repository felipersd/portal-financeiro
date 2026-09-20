import { SharingCenter, MemberConnectionActions } from './SharingCenter';
import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';
import type { GroupMember } from '../types';

export const MembersManager: React.FC = () => {
    const { members, addMember, updateMember, removeMember, isProcessing } = useFinance();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState('Amigo(a)');

    const categories = ['Filho(a)', 'Cônjuge', 'Pai(a)', 'Mãe(a)', 'Primo(a)', 'Amigo(a)', 'Sobrinho(a)', 'Avô', 'Avó'];

    const resetForm = () => {
        setName('');
        setSurname('');
        setEmail('');
        setCategory('Amigo(a)');
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (m: GroupMember) => {
        setEditingId(m.id);
        setName(m.name);
        setSurname(m.surname || '');
        setEmail(m.email || '');
        setCategory(m.category);
        setIsAdding(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                if (!await updateMember(editingId, name, surname || undefined, email || undefined, category)) return;
            } else {
                if (!await addMember(name, surname || undefined, email || undefined, category)) return;
            }
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', margin: 0 }}>Gerenciar Membros</h2>
                {!isAdding && members.length < 10 && (
                    <button className="btn-primary" onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserPlus /> Adicionar Membro
                    </button>
                )}
            </div>

            {members.length >= 10 && !isAdding && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    Você atingiu o limite máximo de 10 membros.
                </div>
            )}

            <p>Adicione pessoas com ou sem conta. O e-mail é opcional; use o convite para vincular alguém ao Portal.</p>
            <SharingCenter />
            {isAdding && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{editingId ? 'Editar Membro' : 'Novo Membro'}</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-row">
                            <div>
                                <label htmlFor="member-name" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nome *</label>
                                <input
                                    required
                                    type="text"
                                    id="member-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: João"
                                />
                            </div>
                            <div>
                                <label htmlFor="member-surname" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Sobrenome</label>
                                <input
                                    type="text"
                                    id="member-surname"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                    className="input-field"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div>
                                <label htmlFor="member-email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>E-mail</label>
                                <input
                                    type="email"
                                    id="member-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label htmlFor="member-category" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Categoria/Parentesco *</label>
                                <select
                                    id="member-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="input-field"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary" disabled={isProcessing}>
                                {editingId ? 'Salvar Alterações' : 'Adicionar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
                {members.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '1rem' }}>
                        Você ainda não adicionou nenhum membro.
                    </div>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="card member-card">
                            <div>
                                <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{member.name} {member.surname}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--primary)' }}>{member.category}</span>
                                    {member.email && <span>✉️ {member.email}</span>}
                                </div>
                            </div>
                            <MemberConnectionActions memberId={member.id} email={member.email} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleEdit(member)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja remover este membro? Membros com lançamentos são preservados para manter o histórico.')) {
                                            removeMember(member.id);
                                        }
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                    title="Remover"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
