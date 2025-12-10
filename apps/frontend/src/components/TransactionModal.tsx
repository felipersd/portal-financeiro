import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Repeat, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Payer, TransactionType, Transaction } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    editTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, editTransaction }) => {
    const { addTransaction, updateTransaction, categories } = useFinance();

    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDescription] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [payer, setPayer] = useState<Payer>('me');

    // Split State
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
    const [customAmount, setCustomAmount] = useState('');
    const [customOwner, setCustomOwner] = useState<'me' | 'spouse'>('me');

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

                if (editTransaction.splitDetails && editTransaction.splitDetails.mode === 'custom') {
                    setSplitMode('custom');
                    setCustomAmount(editTransaction.splitDetails.myShare.toString());
                    setCustomOwner('me');
                } else {
                    setSplitMode('equal');
                    setCustomAmount('');
                    setCustomOwner('me');
                }

            } else {
                // Create Mode
                setType('expense');
                setDescription('');
                setAmountStr('');
                setCategoryId('');
                // Use local date to avoid timezone issues
                const today = new Date();
                const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                setDate(localDate);
                setIsShared(false);
                setPayer('me');
                setRecurrenceFrequency('none');
                setRecurrenceCount(1);
                setSplitMode('equal');
                setCustomAmount('');
                setCustomOwner('me');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const totalAmount = getNumericAmount();
        let splitDetails = undefined;

        if (isShared && type === 'expense') {
            if (splitMode === 'custom' && customAmount) {
                const cAmount = parseFloat(customAmount);
                if (customOwner === 'me') {
                    splitDetails = {
                        mode: 'custom' as const,
                        myShare: cAmount,
                        spouseShare: totalAmount - cAmount
                    };
                } else {
                    splitDetails = {
                        mode: 'custom' as const,
                        myShare: totalAmount - cAmount,
                        spouseShare: cAmount
                    };
                }
            } else {
                splitDetails = {
                    mode: 'equal' as const,
                    myShare: totalAmount / 2,
                    spouseShare: totalAmount / 2
                };
            }
        }

        const data = {
            description,
            amount: totalAmount,
            type,
            category: categoryId,
            date: `${date}T12:00:00`, // Force noon to prevent timezone shifts
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

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Selecione uma data';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
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
                                height: '58px' // Match typical input height
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

                    {/* Recurrence (Only for new expenses) */}
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
                                    </select>
                                </div>
                                {recurrenceFrequency !== 'none' && (
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
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                                <label className="switch">
                                    <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                                <label>Dividir com Cônjuge?</label>
                            </div>

                            {isShared && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-body)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                    <div className="form-group">
                                        <label>Quem pagou?</label>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div
                                                onClick={() => setPayer('me')}
                                                style={{
                                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                                    backgroundColor: payer === 'me' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                    borderColor: payer === 'me' ? 'var(--primary)' : 'var(--border)',
                                                    color: payer === 'me' ? 'var(--primary)' : 'inherit'
                                                }}
                                            >
                                                Eu
                                            </div>
                                            <div
                                                onClick={() => setPayer('spouse')}
                                                style={{
                                                    flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                    cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                                    backgroundColor: payer === 'spouse' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                    borderColor: payer === 'spouse' ? 'var(--primary)' : 'var(--border)',
                                                    color: payer === 'spouse' ? 'var(--primary)' : 'inherit'
                                                }}
                                            >
                                                Cônjuge
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Divisão</label>
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
                                                Meio a Meio (50%)
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

                                        {splitMode === 'custom' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Quanto foi a parte de quem?</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <input
                                                            type="number"
                                                            placeholder="Valor"
                                                            value={customAmount}
                                                            onChange={e => setCustomAmount(e.target.value)}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomOwner('me')}
                                                            style={{
                                                                flex: 1, border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                                backgroundColor: customOwner === 'me' ? 'var(--primary)' : 'transparent',
                                                                color: customOwner === 'me' ? 'white' : 'var(--text-secondary)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Minha
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomOwner('spouse')}
                                                            style={{
                                                                flex: 1, border: '1px solid var(--border)', borderRadius: '0.5rem',
                                                                backgroundColor: customOwner === 'spouse' ? 'var(--primary)' : 'transparent',
                                                                color: customOwner === 'spouse' ? 'white' : 'var(--text-secondary)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Dele(a)
                                                        </button>
                                                    </div>
                                                </div>
                                                {customAmount && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                        {customOwner === 'me'
                                                            ? `Você paga R$ ${parseFloat(customAmount).toFixed(2)} e Cônjuge paga R$ ${(getNumericAmount() - parseFloat(customAmount)).toFixed(2)}`
                                                            : `Cônjuge paga R$ ${parseFloat(customAmount).toFixed(2)} e Você paga R$ ${(getNumericAmount() - parseFloat(customAmount)).toFixed(2)}`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
