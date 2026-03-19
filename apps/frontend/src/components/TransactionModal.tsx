import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Repeat, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { TransactionType, Transaction } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    editTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, editTransaction }) => {
    const { addTransaction, updateTransaction, categories, members } = useFinance();

    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDescription] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState('');
    const [isShared, setIsShared] = useState(false);
    
    // Dynamic Members states
    const [payer, setPayer] = useState<string>('me');
    const [participants, setParticipants] = useState<string[]>(['me']);
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

    // Recurrence State
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('none');
    const [recurrenceCount, setRecurrenceCount] = useState(1);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (editTransaction) {
                // Edit Mode
                if (type !== editTransaction.type) setType(editTransaction.type);
                if (description !== editTransaction.description) setDescription(editTransaction.description);

                setAmountStr(editTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                setCategoryId(editTransaction.category);
                setDate(new Date(editTransaction.date).toISOString().split('T')[0]);
                setIsShared(editTransaction.isShared);
                setPayer(editTransaction.payer);
                setRecurrenceFrequency('none');

                if (editTransaction.splitDetails && (editTransaction.splitDetails as any).splits) {
                    const splits = (editTransaction.splitDetails as any).splits as Array<{memberId: string, amount: number}>;
                    setParticipants(splits.map(s => s.memberId));
                    
                    const firstAmt = splits[0]?.amount || 0;
                    const isEqual = splits.every(s => Math.abs(s.amount - firstAmt) < 0.01);
                    
                    setSplitMode(isEqual ? 'equal' : 'custom');
                    if (!isEqual) {
                        const cs: Record<string, string> = {};
                        splits.forEach(s => cs[s.memberId] = s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                        setCustomSplits(cs);
                    }
                } else if (editTransaction.splitDetails && (editTransaction.splitDetails as any).mode) {
                    // Legacy transaction with 'spouse'
                    setParticipants(['me']);
                    setSplitMode('equal');
                    setCustomSplits({});
                } else {
                    setParticipants([editTransaction.payer]);
                    setSplitMode('equal');
                    setCustomSplits({});
                }

            } else {
                // Create Mode
                setType('expense');
                setDescription('');
                setAmountStr('');
                setCategoryId('');
                const today = new Date();
                const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                setDate(localDate);
                setIsShared(false);
                setPayer('me');
                setParticipants(['me']);
                setSplitMode('equal');
                setCustomSplits({});
                setRecurrenceFrequency('none');
                setRecurrenceCount(1);
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, editTransaction]);

    if (!isOpen) return null;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            setAmountStr('');
            return;
        }
        const numberValue = parseInt(value, 10) / 100;
        setAmountStr(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };

    const getNumericAmount = () => {
        if (!amountStr) return 0;
        return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    };

    const toggleParticipant = (memberId: string) => {
        if (participants.includes(memberId)) {
            if (participants.length > 1) { // Prevents removing everyone
                setParticipants(prev => prev.filter(p => p !== memberId));
            }
        } else {
            setParticipants(prev => [...prev, memberId]);
        }
    };

    const handleCustomSplitChange = (memberId: string, value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits === '') {
            setCustomSplits(prev => {
                const updated = { ...prev, [memberId]: '' };
                if (participants.length === 2) {
                    const otherMember = participants.find(p => p !== memberId)!;
                    const total = getNumericAmount();
                    updated[otherMember] = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                return updated;
            });
            return;
        }
        
        const numberValue = parseInt(digits, 10) / 100;
        const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        setCustomSplits(prev => {
            const updated = { ...prev, [memberId]: formatted };
            
            if (participants.length === 2) {
                const otherMember = participants.find(p => p !== memberId)!;
                const total = getNumericAmount();
                let remaining = total - numberValue;
                if (remaining < 0) remaining = 0;
                updated[otherMember] = remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const totalAmount = getNumericAmount();
        let splitDetails = undefined;

        if (isShared && type === 'expense') {
            const splits: Array<{ memberId: string; amount: number }> = [];
            
            if (splitMode === 'equal') {
                const chunk = totalAmount / participants.length;
                participants.forEach(p => {
                    splits.push({ memberId: p, amount: chunk });
                });
            } else {
                participants.forEach(p => {
                    const amtStr = customSplits[p] || '';
                    const amt = amtStr ? parseFloat(amtStr.replace(/\./g, '').replace(',', '.')) : 0;
                    splits.push({ memberId: p, amount: amt });
                });
            }

            splitDetails = { splits };
        }

        const data = {
            description,
            amount: totalAmount,
            type,
            category: categoryId,
            date: `${date}T12:00:00`,
            isShared: type === 'expense' ? isShared : false,
            payer,
            recurrenceFrequency: !editTransaction ? recurrenceFrequency : undefined,
            recurrenceCount: !editTransaction ? recurrenceCount : undefined,
            splitDetails
        };

        if (editTransaction) {
            await updateTransaction(editTransaction.id, data);
        } else {
            await addTransaction(data);
        }
        onClose();
    };

    const filteredCategories = categories.filter(c => c.type === type);
    const numericAmount = getNumericAmount();

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Selecione uma data';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };
    
    const getMemberName = (id: string) => {
        if (id === 'me') return 'Eu';
        const m = members.find(m => m.id === id);
        return m ? `${m.name}` : 'Membro Excluído';
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)', overflow: 'hidden',
            touchAction: 'none', overscrollBehavior: 'none'
        }}>
            <div className="card" style={{
                width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)', touchAction: 'pan-y'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>{editTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Type Toggle */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div
                            onClick={() => setType('expense')}
                            style={{
                                flex: 1, padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                backgroundColor: type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                borderColor: type === 'expense' ? 'var(--danger)' : 'var(--border)',
                                color: type === 'expense' ? 'var(--danger)' : 'var(--text-secondary)'
                            }}
                        >
                            <ArrowDownCircle size={20} /> Despesa
                        </div>
                        <div
                            onClick={() => setType('income')}
                            style={{
                                flex: 1, padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                backgroundColor: type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderColor: type === 'income' ? 'var(--success)' : 'var(--border)',
                                color: type === 'income' ? 'var(--success)' : 'var(--text-secondary)'
                            }}
                        >
                            <ArrowUpCircle size={20} /> Receita
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Descrição</label>
                        <input required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado..." />
                    </div>

                    <div className="form-group">
                        <label>Valor (R$)</label>
                        <input required value={amountStr} onChange={handleAmountChange} placeholder="0,00" inputMode="numeric" />
                    </div>

                    <div className="form-group">
                        <label>Categoria</label>
                        <select required value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {filteredCategories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Data</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-body)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-primary)',
                                height: '58px'
                            }}>
                                <span>{formatDateDisplay(date)}</span>
                                <Calendar size={20} color="var(--text-secondary)" />
                            </div>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer'
                                }}
                            />
                        </div>
                    </div>

                    {!editTransaction && type === 'expense' && (
                        <div className="card" style={{ backgroundColor: 'var(--bg-body)', padding: '1rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                                <Repeat size={18} /> <strong>Repetição</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Frequência</label>
                                    <select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value)}>
                                        <option value="none">Única</option>
                                        <option value="daily">Diária</option>
                                        <option value="monthly">Mensal</option>
                                        <option value="yearly">Anual</option>
                                        <option value="fixed">Fixo</option>
                                    </select>
                                </div>
                                {recurrenceFrequency !== 'none' && recurrenceFrequency !== 'fixed' && (
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Vezes</label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="360"
                                            value={recurrenceCount}
                                            onChange={e => setRecurrenceCount(parseInt(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {type === 'expense' && (
                        <>
                            <div className="form-group">
                                <label>Quem pagou?</label>
                                <select value={payer} onChange={e => setPayer(e.target.value)}>
                                    <option value="me">Eu</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <label className="switch">
                                    <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                                <label>Dividir despesa com o grupo?</label>
                            </div>

                            {isShared && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-body)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                    <div className="form-group">
                                        <label style={{ marginBottom: '0.5rem' }}>Integrantes da divisão</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {['me', ...members.map(m => m.id)].map(mid => (
                                                <div 
                                                    key={mid}
                                                    onClick={() => toggleParticipant(mid)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '2rem',
                                                        border: `1px solid ${participants.includes(mid) ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: participants.includes(mid) ? 'var(--primary)' : 'transparent',
                                                        color: participants.includes(mid) ? '#fff' : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {getMemberName(mid)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Forma de Divisão</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                            <div
                                                onClick={() => setSplitMode('equal')}
                                                style={{
                                                    flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                    cursor: 'pointer', textAlign: 'center', fontSize: '0.875rem',
                                                    backgroundColor: splitMode === 'equal' ? 'var(--bg-card)' : 'transparent',
                                                    borderColor: splitMode === 'equal' ? 'var(--primary)' : 'var(--border)',
                                                    color: splitMode === 'equal' ? 'var(--primary)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                Partes Iguais
                                            </div>
                                            <div
                                                onClick={() => setSplitMode('custom')}
                                                style={{
                                                    flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                    cursor: 'pointer', textAlign: 'center', fontSize: '0.875rem',
                                                    backgroundColor: splitMode === 'custom' ? 'var(--bg-card)' : 'transparent',
                                                    borderColor: splitMode === 'custom' ? 'var(--primary)' : 'var(--border)',
                                                    color: splitMode === 'custom' ? 'var(--primary)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                Personalizado
                                            </div>
                                        </div>

                                        {/* Dynamic inputs for each participant */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {participants.map(p => (
                                                <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{getMemberName(p)}</span>
                                                    {splitMode === 'equal' ? (
                                                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                            R$ {(numericAmount / participants.length).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <input 
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="0,00"
                                                            value={customSplits[p] || ''}
                                                            onChange={(e) => handleCustomSplitChange(p, e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem 0.5rem', textAlign: 'right' }}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                            
                                            {splitMode === 'custom' && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                    Soma: R$ {participants.reduce((acc, p) => {
                                                        const amtStr = customSplits[p] || '';
                                                        const amt = amtStr ? parseFloat(amtStr.replace(/\./g, '').replace(',', '.')) : 0;
                                                        return acc + amt;
                                                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
