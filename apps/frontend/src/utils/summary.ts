import type { Transaction, GroupMember, FinanceSummary } from '../types';
import { cents } from './money';

export function summarize(transactions: Transaction[], members: GroupMember[]): FinanceSummary {
    let income = 0, spent = 0;
    const balances: Record<string, number> = Object.fromEntries(members.map(m => [m.id, 0]));
    for (const t of transactions) {
        if (t.type === 'income') { income += cents(t.amount); continue; }
        const splits = t.isShared ? t.splitDetails?.splits : undefined;
        spent += cents(splits ? splits.find(s => s.memberId === 'me')?.amount || 0 : t.amount);
        for (const split of splits || []) {
            if (split.memberId === t.payer) continue;
            if (t.payer === 'me' && balances[split.memberId] !== undefined) balances[split.memberId] += cents(split.amount);
            else if (split.memberId === 'me' && balances[t.payer] !== undefined) balances[t.payer] -= cents(split.amount);
        }
        for (const payment of t.settlements || []) {
            if (t.payer === 'me' && balances[payment.memberId] !== undefined) balances[payment.memberId] -= cents(payment.paidAmount);
            else if (t.payer === payment.memberId && balances[payment.memberId] !== undefined) balances[payment.memberId] += cents(payment.paidAmount);
        }
    }
    return { totalIncome: income / 100, totalSpent: spent / 100, currentBalance: (income - spent) / 100,
        netBalance: Object.values(balances).reduce((sum, n) => sum + n, 0) / 100,
        memberBalances: Object.fromEntries(Object.entries(balances).map(([id, value]) => [id, value / 100])),
        hasSharedTransactions: transactions.some(t => t.isShared) };
}
