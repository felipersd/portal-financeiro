import { Download, ArrowUpRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { monthlyAnalysis, personalCents } from '../utils/monthlyAnalysis';
import { currency } from '../utils/money';
import { csvCell } from '../utils/csv';
import { Distribution, MonthlyFlow } from './FinanceCharts';

export function MonthlyReport() {
    const { filteredTransactions, selectedDate, annualTotals, tagsEnabled } = useFinance();
    const report = monthlyAnalysis(filteredTransactions, selectedDate);
    const previous = annualTotals.find((row) => row.month === selectedDate.getMonth());
    const name = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    function exportCsv() {
        const rows = filteredTransactions.map((transaction) => [
            transaction.date.slice(0, 10),
            transaction.description,
            transaction.type === 'income' ? 'Receita' : 'Despesa',
            transaction.category,
            transaction.tags?.map((tag) => tag.name).join(', ') || '',
            (personalCents(transaction) / 100).toFixed(2).replace('.', ','),
            transaction.sharedFromName || (transaction.isShared ? 'Dividida' : 'Individual'),
        ]);
        const blob = new Blob(
            [
                '\ufeff',
                [['Data', 'Descrição', 'Tipo', 'Categoria', 'Tags', 'Minha parte (R$)', 'Origem'], ...rows]
                    .map((row) => row.map(csvCell).join(';'))
                    .join('\r\n'),
            ],
            { type: 'text/csv;charset=utf-8;' },
        );
        const url = URL.createObjectURL(blob),
            link = document.createElement('a');
        link.href = url;
        link.download = `portal-${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">RELATÓRIO MENSAL</span>
                    <h2>Seu mês de {name}</h2>
                    <p>De onde veio, para onde foi e o que ficou.</p>
                </div>
                <button className="btn-secondary" onClick={exportCsv}>
                    <Download size={17} /> Exportar extrato
                </button>
            </div>
            <section className="report-summary card">
                <div>
                    <span>Entrou</span>
                    <strong>{currency(report.income)}</strong>
                </div>
                <span className="report-symbol">−</span>
                <div>
                    <span>Saiu · sua parte</span>
                    <strong>{currency(report.expense)}</strong>
                </div>
                <span className="report-symbol">=</span>
                <div>
                    <span>Resultado do mês</span>
                    <strong className={report.balance < 0 ? 'text-danger' : 'text-success'}>
                        {currency(report.balance)}
                    </strong>
                </div>
            </section>
            <div className="metric-grid">
                <article className="metric-card">
                    <span className="metric-label">Variação das despesas</span>
                    <strong>{previous ? currency(report.expense - previous.expense) : '—'}</strong>
                    <span>
                        {previous
                            ? 'Diferença em relação ao mês anterior'
                            : 'Comparação indisponível para o ano anterior'}
                    </span>
                </article>
                <article className="metric-card">
                    <span className="metric-label">Compromissos recorrentes</span>
                    <strong>{currency(report.fixed)}</strong>
                    <span>{currency(report.variable)} em despesas não fixas</span>
                </article>
                <article className="metric-card">
                    <span className="metric-label">Participação nas receitas</span>
                    <strong>
                        {report.income > 0
                            ? `${((report.expense / report.income) * 100).toFixed(1).replace('.', ',')}%`
                            : '—'}
                    </strong>
                    <span>
                        {report.income > 0
                            ? 'das receitas foram destinadas a despesas'
                            : 'Adicione receitas para comparar'}
                    </span>
                </article>
            </div>
            <section className="card">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">EVOLUÇÃO</span>
                        <h3>Resultado ao longo dos dias</h3>
                    </div>
                </div>
                <MonthlyFlow data={report.daily} />
                <p className="chart-note">
                    O relatório considera todos os lançamentos do mês, inclusive previstos, e somente sua
                    parte nas divisões.
                </p>
            </section>
            <div className="dashboard-grid">
                <section className="card">
                    <h3>Onde você mais gastou</h3>
                    <Distribution limit={1000} rows={report.categories} total={report.expense} />
                </section>
                <section className="card">
                    <h3>Maiores despesas</h3>
                    {!report.largest.length ? (
                        <p className="empty-inline">Nenhuma despesa neste mês.</p>
                    ) : (
                        <ol className="ranked-list">
                            {report.largest.map((transaction, index) => (
                                <li key={transaction.id}>
                                    <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                                    <div>
                                        <strong>{transaction.description}</strong>
                                        <small>
                                            {transaction.category} · {transaction.date.slice(8, 10)}/
                                            {transaction.date.slice(5, 7)}
                                            {transaction.readOnly ? ' · recebida' : ''}
                                        </small>
                                    </div>
                                    <strong>{currency(personalCents(transaction) / 100)}</strong>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
            {tagsEnabled && (
                <section className="card">
                    <h3>Detalhes pelas suas tags</h3>
                    <p className="muted">
                        Uma despesa com duas tags aparece em ambas. Os valores das tags não devem ser somados
                        como um novo total.
                    </p>
                    <Distribution limit={1000} rows={report.tags} total={report.expense} />
                    <p className="chart-note">Sem tag: {currency(report.untagged)}</p>
                </section>
            )}
            <a className="action-banner" href="#transactions">
                <div>
                    <strong>Confira cada lançamento</strong>
                    <p>
                        {report.count} registros compõem este relatório. Filtre e encontre os detalhes no
                        extrato.
                    </p>
                </div>
                <ArrowUpRight size={20} />
            </a>
        </div>
    );
}
