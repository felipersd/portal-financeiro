import { ArrowDownLeft, ArrowUpRight, ArrowRight, Users, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { monthlyAnalysis } from '../utils/monthlyAnalysis';
import { currency } from '../utils/money';
import { AnnualFlow, Distribution, MonthlyFlow } from './FinanceCharts';
import { BudgetRuleChart } from './BudgetRuleChart';

export const Dashboard = () => {
    const { filteredTransactions, selectedDate, annualTotals, user, tagsEnabled, sharing } = useFinance();
    const month = monthlyAnalysis(filteredTransactions, selectedDate);
    const previous = annualTotals.find((row) => row.month === selectedDate.getMonth());
    const variation =
        previous && previous.expense > 0
            ? ((month.expense - previous.expense) / previous.expense) * 100
            : null;
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">SEU DINHEIRO, COM CLAREZA</span>
                    <h2>Olá, {user?.name.split(' ')[0] || 'você'}.</h2>
                    <p>Um olhar sobre o mês. Mais espaço para o que importa.</p>
                </div>
                <span className="quiet-badge">
                    <span /> Controle pessoal
                </span>
            </div>
            <div className="metric-grid">
                <article className="metric-card balance-card">
                    <div className="metric-label">
                        <Wallet size={18} /> Resultado do mês
                    </div>
                    <strong>{currency(month.balance)}</strong>
                    <span>Receitas menos a sua parte nas despesas</span>
                </article>
                <article className="metric-card">
                    <div className="metric-label">
                        <ArrowDownLeft size={18} /> Receitas
                    </div>
                    <strong>{currency(month.income)}</strong>
                    <span>Entradas registradas no mês</span>
                </article>
                <article className="metric-card">
                    <div className="metric-label">
                        <ArrowUpRight size={18} /> Despesas
                    </div>
                    <strong>{currency(month.expense)}</strong>
                    <span>
                        {variation === null
                            ? 'Sua parte, sem contar a dos membros'
                            : `${Math.abs(variation).toFixed(1).replace('.', ',')}% ${variation > 0 ? 'acima' : 'abaixo'} do mês anterior`}
                    </span>
                </article>
            </div>
            {(sharing.attentionCount || 0) > 0 && (
                <a className="action-banner" href="#sharing">
                    <span className="icon-tile">
                        <Users size={20} />
                    </span>
                    <div>
                        <strong>Uma decisão sua faz a diferença</strong>
                        <p>{sharing.attentionCount} pendência(s) entre vínculos, contas e correções.</p>
                    </div>
                    <ArrowRight size={20} />
                </a>
            )}
            <div className="dashboard-grid">
                <section className="card flow-card">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">DIA A DIA</span>
                            <h3>Como o mês evolui</h3>
                        </div>
                        <span className="quiet-badge">Acumulado</span>
                    </div>
                    <MonthlyFlow data={month.daily} />
                    <p className="chart-note">
                        Inclui lançamentos futuros do mês. Não representa o saldo da sua conta bancária.
                    </p>
                </section>
                <section className="card">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">DESTINO DO DINHEIRO</span>
                            <h3>Gastos por categoria</h3>
                        </div>
                    </div>
                    <Distribution rows={month.categories} total={month.expense} />
                </section>
            </div>
            <div className="dashboard-grid">
                <section className="card">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">PERSPECTIVA</span>
                            <h3>Seu ano em movimento</h3>
                        </div>
                        <span className="chart-legend">
                            <i /> Receitas <i /> Despesas
                        </span>
                    </div>
                    <AnnualFlow data={annualTotals} />
                </section>
                <section className="card">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">MAIS CONTEXTO</span>
                            <h3>{tagsEnabled ? 'Um olhar pelas tags' : 'O que compõe seu mês'}</h3>
                        </div>
                    </div>
                    {tagsEnabled ? (
                        <>
                            <Distribution rows={month.tags} total={month.expense} />
                            <p className="chart-note">
                                Tags podem se sobrepor. Uma despesa pode aparecer em mais de uma tag.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="insight-row">
                                <span>Despesas recorrentes</span>
                                <strong>{currency(month.fixed)}</strong>
                            </div>
                            <div className="insight-row">
                                <span>Sua parte em contas divididas</span>
                                <strong>{currency(month.shared)}</strong>
                            </div>
                            <div className="insight-row">
                                <span>Lançamentos no mês</span>
                                <strong>{month.count}</strong>
                            </div>
                            <a href="#organization" className="text-link">
                                Organize por tags, se fizer sentido para você <ArrowRight size={16} />
                            </a>
                        </>
                    )}
                </section>
            </div>
            <BudgetRuleChart />
        </div>
    );
};
