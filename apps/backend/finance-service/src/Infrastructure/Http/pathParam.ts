import { Request } from 'express';
import { FinanceError } from '../../Domain/FinanceError';
export function pathParam(req: Request, name: string): string {
    const value = req.params[name];
    if (typeof value !== 'string' || !value) throw new FinanceError(400, 'Parâmetro inválido.');
    return value;
}
