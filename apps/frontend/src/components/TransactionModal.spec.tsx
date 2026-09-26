import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionModal } from './TransactionModal';
import { FinanceContext } from '../context/FinanceContext';
import { financeFixture } from '../test/financeFixture';
afterEach(cleanup);
describe('Income recurrence form', () => {
    it('exposes recurring income and submits a timezone-qualified date and selected tags', async () => {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        const addTransaction = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
        render(
            <FinanceContext.Provider
                value={financeFixture({
                    addTransaction,
                    tagsEnabled: true,
                    tags: [{ id: 'salary-tag', name: 'Salário', color: '#00836b' }],
                    categories: [{ id: 'work', name: 'Trabalho', type: 'income' }],
                })}
            >
                <TransactionModal isOpen onClose={() => {}} />
            </FinanceContext.Provider>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Receita' }));
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Salário' } });
        fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '250000' } });
        fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'work' } });
        fireEvent.change(screen.getByLabelText('Frequência'), { target: { value: 'fixed' } });
        fireEvent.click(screen.getByRole('button', { name: '#Salário' }));
        fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
        await waitFor(() => expect(addTransaction).toHaveBeenCalled());
        expect(addTransaction.mock.calls[0]?.[0]).toMatchObject({
            description: 'Salário',
            type: 'income',
            amount: 2500,
            categoryId: 'work',
            recurrenceFrequency: 'fixed',
            tagIds: ['salary-tag'],
            date: expect.stringMatching(/T12:00:00\.000Z$/),
        });
    });
});
