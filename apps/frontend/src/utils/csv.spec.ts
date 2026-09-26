import { describe, expect, it } from 'vitest';
import { csvCell } from './csv';

describe('Financial CSV cells', () => {
    it.each(['=1+1', '  =1+1', '\t+1', '\r-1', '@SUM(1)', '\nformula'])(
        'neutralizes formula-like text %j',
        (value) => {
            expect(csvCell(value)).toBe(`"'${value}"`);
        },
    );
    it('preserves normal labels, delimiters, quotes and Brazilian amounts', () => {
        expect(csvCell('Mercado; "bairro"')).toBe('"Mercado; ""bairro"""');
        expect(csvCell('1250,50')).toBe('"1250,50"');
    });
});
