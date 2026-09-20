export const cents = (value: number) => Math.round(value * 100);
export const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function splitEqually(amount: number, ids: string[]) {
    if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Selecione participantes únicos.');
    const total = cents(amount);
    const base = Math.floor(total / ids.length);
    return ids.map((memberId, index) => ({ memberId, amount: (base + (index < total % ids.length ? 1 : 0)) / 100 }));
}
