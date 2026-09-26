import type { Transaction } from '../types';
import { cents } from './money';

export function personalCents(transaction: Transaction) {
    return cents(
        transaction.isShared && transaction.type === 'expense'
            ? transaction.splitDetails?.splits.find((part) => part.memberId === 'me')?.amount || 0
            : transaction.amount,
    );
}

export function monthlyAnalysis(transactions: Transaction[], date: Date) {
    const year = date.getFullYear(),
        month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const daily = Array.from({ length: days }, (_, index) => ({
        day: index + 1,
        income: 0,
        expense: 0,
        balance: 0,
    }));
    const categories = new Map<string, number>();
    const tags = new Map<string, { name: string; cents: number }>();
    let income = 0,
        expense = 0,
        fixed = 0,
        shared = 0,
        untagged = 0;
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const selected = transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey);
    for (const transaction of selected) {
        const value = personalCents(transaction);
        const day = Number(transaction.date.slice(8, 10)) - 1;
        if (!daily[day]) continue;
        if (transaction.type === 'income') {
            income += value;
            daily[day].income += value;
            continue;
        }
        expense += value;
        daily[day].expense += value;
        if (transaction.isFixed) fixed += value;
        if (transaction.isShared || transaction.readOnly) shared += value;
        categories.set(transaction.category, (categories.get(transaction.category) || 0) + value);
        if (!transaction.tags?.length) untagged += value;
        for (const tag of transaction.tags || []) {
            const key = tag.name.normalize('NFKC').toLocaleLowerCase('pt-BR');
            const existing = tags.get(key);
            tags.set(key, { name: existing?.name || tag.name, cents: (existing?.cents || 0) + value });
        }
    }
    let balance = 0;
    return {
        income: income / 100,
        expense: expense / 100,
        balance: (income - expense) / 100,
        fixed: fixed / 100,
        variable: (expense - fixed) / 100,
        shared: shared / 100,
        untagged: untagged / 100,
        daily: daily.map((day) => {
            balance += day.income - day.expense;
            return { ...day, income: day.income / 100, expense: day.expense / 100, balance: balance / 100 };
        }),
        categories: [...categories]
            .map(([name, value]) => ({ name, value: value / 100 }))
            .sort((a, b) => b.value - a.value),
        tags: [...tags.values()]
            .map((tag) => ({ name: tag.name, value: tag.cents / 100 }))
            .sort((a, b) => b.value - a.value),
        largest: selected
            .filter((transaction) => transaction.type === 'expense')
            .sort((a, b) => personalCents(b) - personalCents(a))
            .slice(0, 5),
        count: selected.length,
        days,
    };
}
