import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export const Dashboard: React.FC = () => {
    const { filteredTransactions, transactions, getSummary, selectedDate } = useFinance();
    const summary = getSummary();

    const balanceText = summary.netBalance === 0
        ? "Tudo zerado!"
        : summary.netBalance > 0
            ? `Cônjuge te deve R$ ${summary.netBalance.toFixed(2)}`
            : `Você deve R$ ${Math.abs(summary.netBalance).toFixed(2)}`;

    const balanceClass = summary.netBalance >= 0 ? 'text-success' : 'text-danger';

    // Pie Chart Data (Filtered by Month)
    const expensesByCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const amount = (t.isShared && t.type === 'expense')
                ? (t.splitDetails && t.splitDetails.mode === 'custom' ? t.splitDetails.myShare : t.amount / 2)
                : t.amount;
            acc[t.category] = (acc[t.category] || 0) + amount;
            return acc;
        }, {} as Record<string, number>);

    const pieData = {
        labels: Object.keys(expensesByCategory),
        datasets: [
            {
                data: Object.values(expensesByCategory),
                backgroundColor: [
                    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
                ],
                borderWidth: 0,
            },
        ],
    };

    // Annual History Data (All Transactions)
    const currentYear = selectedDate.getFullYear();
    const monthlyData = Array(12).fill(0).map((_, i) => {
        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === i && d.getFullYear() === currentYear;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            const amount = (t.isShared && t.type === 'expense')
                ? (t.splitDetails && t.splitDetails.mode === 'custom' ? t.splitDetails.myShare : t.amount / 2)
                : t.amount;
            return acc + amount;
        }, 0);

        return { income, expense };
    });

    const barData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [
            {
                label: 'Receitas',
                data: monthlyData.map(d => d.income),
                backgroundColor: '#10b981',
                borderRadius: 4,
            },
            {
                label: 'Despesas',
                data: monthlyData.map(d => d.expense),
                backgroundColor: '#ef4444',
                borderRadius: 4,
            },
        ],
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' as const },
            title: { display: true, text: `Histórico Anual (${currentYear})` },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            x: { grid: { display: false } }
        }
    };

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Receita</h3>
                    <span className="text-success" style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {summary.totalIncome.toFixed(2)}</span>
                </div>
                <div className="card">
                    <h3 className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Despesas</h3>
                    <span className="text-danger" style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {summary.totalSpent.toFixed(2)}</span>
                </div>
                <div className="card">
                    <h3 className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Saldo</h3>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.currentBalance >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                        R$ {summary.currentBalance.toFixed(2)}
                    </span>
                </div>
                {summary.hasSharedTransactions && (
                    <div className="card">
                        <h3 className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Balanço Casal</h3>
                        <span className={balanceClass} style={{ fontSize: '1.25rem', fontWeight: 700 }}>{balanceText}</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ height: '300px' }}>
                    <Doughnut
                        data={pieData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { color: '#94a3b8' } },
                                title: { display: true, text: 'Gastos por Categoria', color: '#f8fafc' }
                            }
                        }}
                    />
                </div>
                <div className="card" style={{ height: '300px' }}>
                    <Bar
                        data={barData}
                        options={barOptions}
                    />
                </div>
            </div>
        </div>
    );
};
