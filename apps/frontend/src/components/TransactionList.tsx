import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Edit2, Inbox, Repeat2, Search, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { currency } from '../utils/money';
import { personalCents } from '../utils/monthlyAnalysis';
import { TransactionModal } from './TransactionModal';
import type { Transaction } from '../types';

export function TransactionList() {
    const { filteredTransactions, removeTransaction, stopRecurrence, isProcessing, tagsEnabled } =
        useFinance();
    const [editing, setEditing] = useState<Transaction | null>(null);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const [category, setCategory] = useState('');
    const [tag, setTag] = useState('');
    const [limit, setLimit] = useState(50);
    const categories = [...new Set(filteredTransactions.map((item) => item.category))].sort();
    const tags = [
        ...new Set(filteredTransactions.flatMap((item) => item.tags?.map((value) => value.name) || [])),
    ].sort();
    const results = useMemo(
        () =>
            filteredTransactions
                .filter(
                    (item) =>
                        (type === 'all' || item.type === type) &&
                        (!category || item.category === category) &&
                        (!tag || item.tags?.some((value) => value.name === tag)) &&
                        `${item.description} ${item.category} ${item.sharedFromName || ''} ${item.tags?.map((value) => value.name).join(' ') || ''}`
                            .toLocaleLowerCase('pt-BR')
                            .includes(search.trim().toLocaleLowerCase('pt-BR')),
                )
                .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
        [filteredTransactions, search, type, category, tag],
    );
    const net =
        results.reduce((sum, item) => sum + personalCents(item) * (item.type === 'income' ? 1 : -1), 0) / 100;
    function filter(update: () => void) {
        update();
        setLimit(50);
    }
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">CADA MOVIMENTO CONTA</span>
                    <h2>Seu mês, em detalhes</h2>
                    <p>Encontre um lançamento e entenda sua parte em cada despesa.</p>
                </div>
            </div>
            <section className="card transaction-panel">
                <div className="transaction-filters">
                    <label className="search-field">
                        <Search size={17} />
                        <input
                            aria-label="Buscar lançamentos"
                            placeholder="Buscar descrição, pessoa ou tag"
                            value={search}
                            onChange={(event) => filter(() => setSearch(event.target.value))}
                        />
                    </label>
                    <select
                        aria-label="Tipo de lançamento"
                        value={type}
                        onChange={(event) => filter(() => setType(event.target.value))}
                    >
                        <option value="all">Todos os tipos</option>
                        <option value="income">Receitas</option>
                        <option value="expense">Despesas</option>
                    </select>
                    <select
                        aria-label="Filtrar categoria"
                        value={category}
                        onChange={(event) => filter(() => setCategory(event.target.value))}
                    >
                        <option value="">Todas as categorias</option>
                        {categories.map((name) => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                    {tagsEnabled && (
                        <select
                            aria-label="Filtrar tag"
                            value={tag}
                            onChange={(event) => filter(() => setTag(event.target.value))}
                        >
                            <option value="">Todas as tags</option>
                            {tags.map((name) => (
                                <option key={name}>{name}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="transaction-summary">
                    <span>
                        {results.length} lançamento{results.length !== 1 ? 's' : ''}
                    </span>
                    <span>
                        Resultado neste filtro <strong>{currency(net)}</strong>
                    </span>
                </div>
                {!results.length && (
                    <div className="empty-state">
                        <Inbox size={30} />
                        <h3>Nenhum lançamento encontrado</h3>
                        <p>Adicione uma receita ou despesa, ou ajuste os filtros.</p>
                    </div>
                )}
                {results.slice(0, limit).map((item, index) => {
                    const locked =
                        item.readOnly ||
                        item.sharedWith?.some((share) => ['pending', 'accepted'].includes(share.status));
                    return (
                        <div key={item.id}>
                            {(index === 0 ||
                                results[index - 1].date.slice(0, 10) !== item.date.slice(0, 10)) && (
                                <h3 className="transaction-date">
                                    {new Date(item.date).toLocaleDateString('pt-BR', {
                                        day: 'numeric',
                                        month: 'long',
                                        weekday: 'short',
                                        timeZone: 'UTC',
                                    })}
                                </h3>
                            )}
                            <article className="transaction-row">
                                <span className={`transaction-symbol ${item.type}`}>
                                    {item.type === 'income' ? (
                                        <ArrowDownLeft size={19} />
                                    ) : (
                                        <ArrowUpRight size={19} />
                                    )}
                                </span>
                                <div className="transaction-description">
                                    <strong>{item.description}</strong>
                                    <small>
                                        {item.category}
                                        {item.sharedFromName && ` · De ${item.sharedFromName}`}
                                        {item.isFixed && ' · Recorrente'}
                                    </small>
                                    <div className="chip-list">
                                        {tagsEnabled &&
                                            item.tags?.map((value) => (
                                                <span className="chip" key={value.id}>
                                                    #{value.name}
                                                </span>
                                            ))}
                                    </div>
                                    {(item.readOnly || Boolean(item.sharedWith?.length)) && (
                                        <a className="text-link compact-link" href="#sharing">
                                            {item.sharedWith?.some((share) => share.status === 'pending')
                                                ? 'Aguardando aceite'
                                                : 'Ver compartilhamento'}
                                        </a>
                                    )}
                                </div>
                                <div className="transaction-value">
                                    <strong className={item.type === 'income' ? 'text-success' : ''}>
                                        {item.type === 'income' ? '+' : '−'}{' '}
                                        {currency(personalCents(item) / 100)}
                                    </strong>
                                    {item.isShared && (
                                        <small>Sua parte · total {currency(item.amount)}</small>
                                    )}
                                </div>
                                <div className="transaction-actions">
                                    {!locked && (
                                        <>
                                            <button
                                                className="icon-btn"
                                                aria-label={`Editar ${item.description}`}
                                                disabled={isProcessing}
                                                onClick={() => setEditing(item)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                aria-label={`Excluir ${item.description}`}
                                                disabled={isProcessing}
                                                onClick={() => {
                                                    if (confirm('Excluir este lançamento?'))
                                                        void removeTransaction(item.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            {item.isFixed && (
                                                <button
                                                    className="icon-btn"
                                                    aria-label={`Encerrar recorrência de ${item.description}`}
                                                    disabled={isProcessing}
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                'Encerrar esta recorrência a partir deste mês? Os meses anteriores serão preservados.',
                                                            )
                                                        )
                                                            void stopRecurrence(item.id);
                                                    }}
                                                >
                                                    <Repeat2 size={16} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </article>
                        </div>
                    );
                })}
                {results.length > limit && (
                    <button className="btn-secondary" onClick={() => setLimit((value) => value + 50)}>
                        Ver mais lançamentos
                    </button>
                )}
            </section>
            <TransactionModal isOpen={!!editing} onClose={() => setEditing(null)} editTransaction={editing} />
        </div>
    );
}
