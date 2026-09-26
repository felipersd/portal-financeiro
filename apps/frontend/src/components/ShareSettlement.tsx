import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import type { SharingState, ShareHistoryPage } from '../types';
import { currency } from '../utils/money';

export function ShareSettlement({ share }: { share: SharingState['shares'][number] }) {
    const { isProcessing, proposeShareChange, decideProposal, getShareHistory } = useFinance();
    const [amount, setAmount] = useState(String(share.amount));
    const [history, setHistory] = useState<ShareHistoryPage>();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function load(more = false) {
        setLoading(true);
        try {
            const page = await getShareHistory(share.id, more ? history?.nextCursor || undefined : undefined);
            setHistory({
                items: more ? [...(history?.items || []), ...page.items] : page.items,
                nextCursor: page.nextCursor,
            });
        } catch {
            setError('Não foi possível carregar o histórico.');
        } finally {
            setLoading(false);
        }
    }
    const status: Record<string, string> = {
        pending: 'Pendente',
        accepted: 'Confirmada',
        declined: 'Recusada',
        cancelled: 'Cancelada',
    };
    return (
        <div className="share-correction">
            {share.proposal ? (
                <div className="notice">
                    <strong>Proposta: {currency(share.proposal.amount)}</strong>
                    <p>
                        {share.proposal.proposedByMe
                            ? 'Aguardando a resposta da outra pessoa.'
                            : 'Confira o novo valor da parte do membro antes de responder.'}
                    </p>
                    <div className="sharing-actions">
                        {share.proposal.proposedByMe ? (
                            <button
                                className="btn-secondary"
                                disabled={isProcessing}
                                onClick={() => void decideProposal(share.proposal!.id, 'cancel')}
                            >
                                Cancelar proposta
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn-primary"
                                    disabled={isProcessing}
                                    onClick={() => void decideProposal(share.proposal!.id, 'accept')}
                                >
                                    Aceitar correção
                                </button>
                                <button
                                    className="btn-secondary"
                                    disabled={isProcessing}
                                    onClick={() => void decideProposal(share.proposal!.id, 'decline')}
                                >
                                    Recusar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                share.canAdjust && (
                    <details>
                        <summary>Propor correção de valor</summary>
                        <p className="muted">
                            O total da conta permanece igual. A diferença é ajustada entre você e a outra
                            pessoa, após o aceite.
                        </p>
                        <form
                            className="correction-form"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                await proposeShareChange(share.id, 'adjustment', Number(amount));
                            }}
                        >
                            <label htmlFor={`correction-${share.id}`}>
                                {share.direction === 'incoming'
                                    ? 'Novo valor da sua parte'
                                    : 'Novo valor da parte do membro'}
                                <input
                                    id={`correction-${share.id}`}
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={share.total}
                                    step="0.01"
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    required
                                />
                            </label>
                            <button className="btn-primary" disabled={isProcessing}>
                                Enviar proposta
                            </button>
                        </form>
                    </details>
                )
            )}
            <details
                onToggle={(event) => {
                    if (event.currentTarget.open && !history) void load();
                }}
            >
                <summary>Histórico da conta</summary>
                {loading && <p role="status">Carregando…</p>}
                {error && <p role="alert">{error}</p>}
                {history?.items.length === 0 && <p className="muted">Nenhuma correção registrada.</p>}
                {history?.items.map((item) => (
                    <p className="history-row" key={item.id}>
                        {item.kind === 'adjustment' ? 'Correção' : 'Registro anterior'} ·{' '}
                        {currency(item.amount)} · {status[item.status]}
                        <small>
                            {new Date(item.createdAt).toLocaleDateString('pt-BR')} ·{' '}
                            {item.proposedByMe ? 'Você' : 'Outra pessoa'}
                        </small>
                    </p>
                ))}
                {history?.nextCursor && (
                    <button className="btn-secondary" disabled={loading} onClick={() => void load(true)}>
                        Mais registros
                    </button>
                )}
            </details>
        </div>
    );
}
