import { useModalDialog } from '../hooks/useModalDialog';
import { currency, splitEqually } from '../utils/money';
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
    const {
        addTransaction,
        updateTransaction,
        categories,
        members,
        isProcessing,
        requestError,
        tags,
        tagsEnabled,
        sharing,
        selectedDate,
    } = useFinance();

    const dialogRef = useModalDialog(isOpen);
    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDescription] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tagIds, setTagIds] = useState<string[]>([]);
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
            setTagIds(editTransaction?.tagIds || editTransaction?.tags?.map((tag) => tag.id) || []);
            if (editTransaction) {
                // Edit Mode
                if (type !== editTransaction.type) setType(editTransaction.type);
                if (description !== editTransaction.description) setDescription(editTransaction.description);

                setAmountStr(editTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                setCategoryId(
                    editTransaction.categoryId ||
                        categories.find(
                            (c) => c.name === editTransaction.category && c.type === editTransaction.type,
                        )?.id ||
                        '',
                );
                setDate(new Date(editTransaction.date).toISOString().split('T')[0]);
                setIsShared(editTransaction.isShared);
                setPayer(editTransaction.payer);
                setRecurrenceFrequency('none');

                const splitDetails = editTransaction.splitDetails as
                    { splits?: Array<{ memberId: string; amount: number }>; mode?: string } | undefined;
                if (splitDetails && splitDetails.splits) {
                    const splits = splitDetails.splits;
                    setParticipants(splits.map((s) => s.memberId));

                    const firstAmt = splits[0]?.amount || 0;
                    const isEqual = splits.every((s) => Math.abs(s.amount - firstAmt) < 0.01);

                    setSplitMode(isEqual ? 'equal' : 'custom');
                    if (!isEqual) {
                        const cs: Record<string, string> = {};
                        splits.forEach(
                            (s) =>
                                (cs[s.memberId] = s.amount.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })),
                        );
                        setCustomSplits(cs);
                    }
                } else if (splitDetails && splitDetails.mode) {
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
                const now = new Date();
                const today = new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    Math.min(
                        now.getDate(),
                        new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate(),
                    ),
                );
                const localDate =
                    today.getFullYear() +
                    '-' +
                    String(today.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(today.getDate()).padStart(2, '0');
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
        setAmountStr(
            numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        );
    };

    const getNumericAmount = () => {
        if (!amountStr) return 0;
        return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    };

    const toggleParticipant = (memberId: string) => {
        if (participants.includes(memberId)) {
            if (participants.length > 1) {
                // Prevents removing everyone
                setParticipants((prev) => prev.filter((p) => p !== memberId));
            }
        } else {
            setParticipants((prev) => [...prev, memberId]);
        }
    };

    const handleCustomSplitChange = (memberId: string, value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits === '') {
            setCustomSplits((prev) => {
                const updated = { ...prev, [memberId]: '' };
                if (participants.length === 2) {
                    const otherMember = participants.find((p) => p !== memberId)!;
                    const total = getNumericAmount();
                    updated[otherMember] = total.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                }
                return updated;
            });
            return;
        }

        const numberValue = parseInt(digits, 10) / 100;
        const formatted = numberValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        setCustomSplits((prev) => {
            const updated = { ...prev, [memberId]: formatted };

            if (participants.length === 2) {
                const otherMember = participants.find((p) => p !== memberId)!;
                const total = getNumericAmount();
                let remaining = total - numberValue;
                if (remaining < 0) remaining = 0;
                updated[otherMember] = remaining.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
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
                splits.push(...splitEqually(totalAmount, participants));
            } else {
                participants.forEach((p) => {
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
            category: categories.find((c) => c.id === categoryId)?.name || '',
            categoryId,
            tagIds,
            date: `${date}T12:00:00.000Z`,
            isShared: type === 'expense' ? isShared : false,
            payer: isShared && type === 'expense' ? payer : 'me',
            recurrenceFrequency: !editTransaction ? recurrenceFrequency : undefined,
            recurrenceCount: !editTransaction ? recurrenceCount : undefined,
            splitDetails,
        };

        if (editTransaction) {
            if (!(await updateTransaction(editTransaction.id, data))) return;
        } else {
            if (!(await addTransaction(data))) return;
        }
        onClose();
    };

    const filteredCategories = categories.filter((c) => c.type === type);
    const numericAmount = getNumericAmount();

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Selecione uma data';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    const getMemberName = (id: string) => {
        if (id === 'me') return 'Eu';
        const m = members.find((m) => m.id === id);
        return m ? `${m.name}` : 'Membro Excluído';
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
                overflow: 'hidden',
                touchAction: 'none',
                overscrollBehavior: 'none',
            }}
        >
            <dialog
                ref={dialogRef}
                onCancel={(e) => {
                    e.preventDefault();
                    onClose();
                }}
                className="card native-modal"
                aria-labelledby="transaction-heading"
                style={{
                    width: '90%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-lg)',
                    touchAction: 'pan-y',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                    }}
                >
                    <h2 id="transaction-heading">
                        {editTransaction ? 'Editar Transação' : 'Nova Transação'}
                    </h2>
                    <button
                        aria-label="Fechar transação"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Type Toggle */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <button
                            type="button"
                            aria-pressed={type === 'expense'}
                            onClick={() => {
                                setType('expense');
                                setCategoryId('');
                            }}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor:
                                    type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                borderColor: type === 'expense' ? 'var(--danger)' : 'var(--border)',
                                color: type === 'expense' ? 'var(--danger)' : 'var(--text-secondary)',
                            }}
                        >
                            <ArrowDownCircle size={20} /> Despesa
                        </button>
                        <button
                            type="button"
                            aria-pressed={type === 'income'}
                            onClick={() => {
                                setType('income');
                                setCategoryId('');
                                setIsShared(false);
                                setPayer('me');
                            }}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor:
                                    type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderColor: type === 'income' ? 'var(--success)' : 'var(--border)',
                                color: type === 'income' ? 'var(--success)' : 'var(--text-secondary)',
                            }}
                        >
                            <ArrowUpCircle size={20} /> Receita
                        </button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="transaction-description">Descrição</label>
                        <input
                            id="transaction-description"
                            required
                            minLength={2}
                            maxLength={200}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Mercado..."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="transaction-amount">Valor (R$)</label>
                        <input
                            id="transaction-amount"
                            required
                            value={amountStr}
                            onChange={handleAmountChange}
                            placeholder="0,00"
                            inputMode="numeric"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="transaction-category">Categoria</label>
                        <select
                            id="transaction-category"
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {filteredCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {tagsEnabled && (
                        <fieldset className="tag-selector">
                            <legend>
                                Tags <span className="muted">· opcional, até 5</span>
                            </legend>
                            <div className="chip-list">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`chip ${tagIds.includes(tag.id) ? 'selected' : ''}`}
                                        aria-pressed={tagIds.includes(tag.id)}
                                        onClick={() =>
                                            setTagIds((previous) =>
                                                previous.includes(tag.id)
                                                    ? previous.filter((id) => id !== tag.id)
                                                    : previous.length < 5
                                                      ? [...previous, tag.id]
                                                      : previous,
                                            )
                                        }
                                    >
                                        #{tag.name}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}
                    <div className="form-group">
                        <label htmlFor="transaction-date">Data</label>
                        <div style={{ position: 'relative' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: 'var(--bg-body)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    color: 'var(--text-primary)',
                                    height: '58px',
                                }}
                            >
                                <span>{formatDateDisplay(date)}</span>
                                <Calendar size={20} color="var(--text-secondary)" />
                            </div>
                            <input
                                type="date"
                                disabled={!!editTransaction?.isFixed}
                                id="transaction-date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer',
                                }}
                            />
                        </div>
                    </div>

                    {!editTransaction && (
                        <div
                            className="card"
                            style={{
                                backgroundColor: 'var(--bg-body)',
                                padding: '1rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                    color: 'var(--primary)',
                                }}
                            >
                                <Repeat size={18} /> <strong>Repetição</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label htmlFor="transaction-frequency">Frequência</label>
                                    <select
                                        id="transaction-frequency"
                                        value={recurrenceFrequency}
                                        onChange={(e) => {
                                            setRecurrenceFrequency(e.target.value);
                                            setRecurrenceCount(2);
                                        }}
                                    >
                                        <option value="none">Única</option>
                                        <option value="daily">Diária</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensal, por um período</option>
                                        <option value="yearly">Anual</option>
                                        <option value="fixed">Todo mês, sem data final</option>
                                    </select>
                                </div>
                                {recurrenceFrequency !== 'none' && recurrenceFrequency !== 'fixed' && (
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label htmlFor="transaction-count">Vezes</label>
                                        <input
                                            type="number"
                                            id="transaction-count"
                                            min="2"
                                            max="120"
                                            value={recurrenceCount}
                                            onChange={(e) => setRecurrenceCount(parseInt(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {type === 'expense' && (
                        <>
                            {isShared && (
                                <div className="form-group">
                                    <label htmlFor="transaction-payer">Quem pagou?</label>
                                    <select
                                        id="transaction-payer"
                                        value={payer}
                                        onChange={(e) => setPayer(e.target.value)}
                                    >
                                        <option value="me">Eu</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div
                                className="form-group"
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    marginTop: '1rem',
                                }}
                            >
                                <label className="switch">
                                    <input
                                        aria-label="Dividir despesa com o grupo"
                                        type="checkbox"
                                        checked={isShared}
                                        onChange={(e) => setIsShared(e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <label>Dividir despesa com o grupo?</label>
                            </div>

                            {isShared && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        padding: '1rem',
                                        backgroundColor: 'var(--bg-body)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div className="form-group">
                                        <label style={{ marginBottom: '0.5rem' }}>
                                            Integrantes da divisão
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {['me', ...members.map((m) => m.id)].map((mid) => (
                                                <button
                                                    type="button"
                                                    aria-pressed={participants.includes(mid)}
                                                    key={mid}
                                                    onClick={() => toggleParticipant(mid)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '2rem',
                                                        border: `1px solid ${participants.includes(mid) ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: participants.includes(mid)
                                                            ? 'var(--primary)'
                                                            : 'transparent',
                                                        color: participants.includes(mid)
                                                            ? '#fff'
                                                            : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {getMemberName(mid)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Forma de Divisão</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                            <button
                                                type="button"
                                                aria-pressed={splitMode === 'equal'}
                                                onClick={() => setSplitMode('equal')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '0.5rem',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    fontSize: '0.875rem',
                                                    backgroundColor:
                                                        splitMode === 'equal'
                                                            ? 'var(--bg-card)'
                                                            : 'transparent',
                                                    borderColor:
                                                        splitMode === 'equal'
                                                            ? 'var(--primary)'
                                                            : 'var(--border)',
                                                    color:
                                                        splitMode === 'equal'
                                                            ? 'var(--primary)'
                                                            : 'var(--text-secondary)',
                                                }}
                                            >
                                                Partes Iguais
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={splitMode === 'custom'}
                                                onClick={() => setSplitMode('custom')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '0.5rem',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    fontSize: '0.875rem',
                                                    backgroundColor:
                                                        splitMode === 'custom'
                                                            ? 'var(--bg-card)'
                                                            : 'transparent',
                                                    borderColor:
                                                        splitMode === 'custom'
                                                            ? 'var(--primary)'
                                                            : 'var(--border)',
                                                    color:
                                                        splitMode === 'custom'
                                                            ? 'var(--primary)'
                                                            : 'var(--text-secondary)',
                                                }}
                                            >
                                                Personalizado
                                            </button>
                                        </div>

                                        {/* Dynamic inputs for each participant */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            {participants.map((p) => (
                                                <div
                                                    key={p}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.5rem',
                                                        background: 'var(--bg-card)',
                                                        borderRadius: '0.5rem',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.9rem',
                                                            color: 'var(--text-primary)',
                                                        }}
                                                    >
                                                        {getMemberName(p)}
                                                    </span>
                                                    {splitMode === 'equal' ? (
                                                        <span
                                                            style={{
                                                                fontWeight: 600,
                                                                color: 'var(--primary)',
                                                            }}
                                                        >
                                                            {currency(
                                                                splitEqually(
                                                                    numericAmount,
                                                                    participants,
                                                                ).find((s) => s.memberId === p)?.amount || 0,
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            aria-label={`Parte de ${getMemberName(p)}`}
                                                            inputMode="numeric"
                                                            placeholder="0,00"
                                                            value={customSplits[p] || ''}
                                                            onChange={(e) =>
                                                                handleCustomSplitChange(p, e.target.value)
                                                            }
                                                            style={{
                                                                width: '100px',
                                                                padding: '0.25rem 0.5rem',
                                                                textAlign: 'right',
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ))}

                                            {splitMode === 'custom' && (
                                                <div
                                                    style={{
                                                        marginTop: '0.5rem',
                                                        fontSize: '0.8rem',
                                                        textAlign: 'right',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    Soma: R${' '}
                                                    {participants
                                                        .reduce((acc, p) => {
                                                            const amtStr = customSplits[p] || '';
                                                            const amt = amtStr
                                                                ? parseFloat(
                                                                      amtStr
                                                                          .replace(/\./g, '')
                                                                          .replace(',', '.'),
                                                                  )
                                                                : 0;
                                                            return acc + amt;
                                                        }, 0)
                                                        .toLocaleString('pt-BR', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}{' '}
                                                    /{' '}
                                                    {numericAmount.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isShared && (
                        <p className="notice">
                            {participants.some((id) =>
                                sharing.connections.some((c) => c.memberId === id && c.status === 'accepted'),
                            )
                                ? 'Ao salvar, os membros vinculados recebem sua parte automaticamente para aceitar ou recusar.'
                                : 'Membros sem vínculo ficam apenas no seu controle. Nenhum convite de conta é enviado.'}
                        </p>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            marginTop: '2rem',
                        }}
                    >
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isProcessing} className="btn-primary">
                            Salvar
                        </button>
                    </div>
                </form>
                {requestError && <p role="alert">{requestError}</p>}
            </dialog>
        </div>
    );
};
