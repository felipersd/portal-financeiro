import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { currency } from '../utils/money';
import type { AnnualTotal } from '../types';

const axis = { fontSize: 11, fill: '#72807c' };
const tooltip = {
    border: '1px solid #dce6e1',
    borderRadius: 12,
    fontSize: 13,
    boxShadow: '0 8px 24px #132a2010',
};
const compact = (value: number) => (Math.abs(value) >= 1000 ? `${value / 1000} mil` : `${value}`);

export function MonthlyFlow({ data }: { data: Array<{ day: number; balance: number }> }) {
    return (
        <div
            className="chart-area"
            role="img"
            aria-label="Resultado acumulado dos lançamentos ao longo do mês"
        >
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00836b" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#00836b" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e9eeeb" strokeDasharray="3 5" />
                    <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={30} />
                    <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compact} width={50} />
                    <Tooltip
                        formatter={(value) => [currency(Number(value)), 'Resultado acumulado']}
                        labelFormatter={(day) => `Dia ${day}`}
                        contentStyle={tooltip}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#00836b"
                        fill="url(#balance-fill)"
                        strokeWidth={2.5}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function AnnualFlow({ data }: { data: AnnualTotal[] }) {
    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return (
        <div className="chart-area" role="img" aria-label="Receitas e despesas mensais do ano">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.map((row) => ({ ...row, name: names[row.month - 1] }))}
                    barGap={3}
                    margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
                >
                    <CartesianGrid vertical={false} stroke="#e9eeeb" />
                    <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
                    <YAxis tick={axis} tickFormatter={compact} axisLine={false} tickLine={false} width={50} />
                    <Tooltip
                        formatter={(value, name) => [
                            currency(Number(value)),
                            name === 'income' ? 'Receitas' : 'Despesas',
                        ]}
                        contentStyle={tooltip}
                    />
                    <Bar
                        dataKey="income"
                        fill="#00836b"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={16}
                        isAnimationActive={false}
                    />
                    <Bar
                        dataKey="expense"
                        fill="#b4a4d8"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={16}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function Distribution({
    rows,
    total,
    limit = 7,
}: {
    rows: Array<{ name: string; value: number }>;
    total: number;
    limit?: number;
}) {
    if (!rows.length)
        return <p className="empty-inline">Seus gastos aparecerão aqui quando você adicionar uma despesa.</p>;
    return (
        <div className="distribution">
            {rows.slice(0, limit).map((row, index) => (
                <div key={row.name}>
                    <div className="distribution-label">
                        <span>
                            <i
                                style={{
                                    background: ['#00836b', '#7c6bad', '#6a9dac', '#b69c68'][index % 4],
                                }}
                            />
                            {row.name}
                        </span>
                        <strong>{currency(row.value)}</strong>
                    </div>
                    <div className="track">
                        <div
                            style={{
                                width: `${Math.min(100, total > 0 ? (row.value / total) * 100 : 0)}%`,
                                background: ['#00836b', '#7c6bad', '#6a9dac', '#b69c68'][index % 4],
                            }}
                        />
                    </div>
                    <small>
                        {total > 0
                            ? ((row.value / total) * 100).toLocaleString('pt-BR', {
                                  maximumFractionDigits: 1,
                              })
                            : 0}
                        % das despesas pessoais
                    </small>
                </div>
            ))}
            {rows.length > limit && (
                <p className="chart-note">
                    Exibindo os {limit} maiores grupos. Veja a distribuição completa em Relatórios.
                </p>
            )}
        </div>
    );
}
