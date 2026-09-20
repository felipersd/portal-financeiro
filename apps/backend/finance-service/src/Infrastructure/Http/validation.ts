import { z } from 'zod';

export const money = z.number().finite().min(0).max(10000000).refine(
    value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    'Use no máximo duas casas decimais.'
);
export const transactionSchema = z.object({
    description: z.string().trim().min(2).max(200),
    amount: money.refine(value => value > 0, 'Informe um valor maior que zero.'),
    type: z.enum(['income', 'expense']),
    category: z.string().trim().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)?$/)
        .refine(value => Number.isFinite(Date.parse(value)) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2200 && new Date(value).toISOString().slice(0, 10) === value.slice(0, 10), 'Data inválida.'),
    isShared: z.boolean().default(false),
    payer: z.string().min(1).max(100).default('me'),
    splitDetails: z.object({ splits: z.array(z.object({ memberId: z.string().min(1).max(100), amount: money })).min(1).max(11) }).nullish(),
    recurrenceFrequency: z.enum(['none', 'monthly', 'fixed']).optional(),
    recurrenceCount: z.number().int().min(1).max(120).optional(),
}).superRefine((data, ctx) => {
    if (data.isShared) {
        const splits = data.splitDetails?.splits || [];
        if (data.type !== 'expense' || !splits.length || new Set(splits.map(s => s.memberId)).size !== splits.length ||
            splits.reduce((sum, s) => sum + Math.round(s.amount * 100), 0) !== Math.round(data.amount * 100)) {
            ctx.addIssue({ code: 'custom', path: ['splitDetails'], message: 'A divisão deve conter participantes únicos e somar exatamente o valor da despesa.' });
        }
    } else if (data.splitDetails || data.payer !== 'me') {
        ctx.addIssue({ code: 'custom', path: ['payer'], message: 'Uma conta individual deve ser paga por você e não pode conter divisão.' });
    }
});
export const memberSchema = z.object({
    name: z.string().trim().min(1).max(80),
    surname: z.string().trim().max(80).nullish(),
    email: z.string().trim().email().max(254).transform(v => v.toLowerCase()).nullish(),
    category: z.string().trim().min(1).max(60),
});

export const categorySchema = z.object({ name: z.string().trim().min(1).max(100), type: z.enum(['income', 'expense']) });
export const budgetSchema = z.object({
    divisions: z.array(z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(80),
        percentage: z.number().finite().min(0).max(100), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).min(1).max(10),
    mapping: z.record(z.string().max(100), z.string().max(100)).refine(v => Object.keys(v).length <= 200),
}).superRefine((data, ctx) => {
    if (new Set(data.divisions.map(d => d.id)).size !== data.divisions.length ||
        Math.abs(data.divisions.reduce((sum, d) => sum + d.percentage, 0) - 100) > 0.001) {
        ctx.addIssue({ code: 'custom', message: 'As divisões devem ser únicas e somar 100%.' });
    }
    const ids = new Set(data.divisions.map(d => d.id));
    if (Object.values(data.mapping).some(id => !ids.has(id))) ctx.addIssue({ code: 'custom', message: 'Selecione uma divisão válida para cada categoria.' });
});
