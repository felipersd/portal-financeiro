import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Inbox, RefreshCw } from 'lucide-react';
import { ShareSettlement } from './ShareSettlement';
import { useFinance } from '../context/FinanceContext';
import { currency } from '../utils/money';
import './sharing.css';

const connectionLabels: Record<string, string> = {
    pending: 'Convite enviado',
    accepted: 'Vínculo ativo',
    declined: 'Convite recusado',
    revoked: 'Vínculo encerrado',
    expired: 'Convite expirado',
};
const labels: Record<string, string> = {
    pending: 'Aguardando aceite',
    accepted: 'Aceita',
    declined: 'Recusada',
    cancelled: 'Cancelada',
};
export function SharingCenter() {
    const {
        sharing,
        sharingError,
        isProcessing,
        decideShare,
        refreshSharing,
        members,
        hasMoreSharing,
        isLoadingMoreSharing,
        loadMoreSharing,
        selectedDate,
        getSummary,
    } = useFinance();
    const [tab, setTab] = useState<'pending' | 'received' | 'sent' | 'history' | 'personal'>('pending');
    const [allMonths, setAllMonths] = useState(false);
    const month = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const balances = Object.entries(getSummary().memberBalances);
    const invitations = sharing.connections.filter(
        (link) => link.direction === 'incoming' && link.status === 'pending',
    ).length;
    const pending = sharing.shares.filter(
        (share) =>
            (share.direction === 'incoming' && share.status === 'pending') ||
            (share.proposal && !share.proposal.proposedByMe),
    );
    const candidates =
        tab === 'pending'
            ? pending
            : sharing.shares.filter((share) =>
                  tab === 'received'
                      ? share.direction === 'incoming'
                      : tab === 'sent'
                        ? share.direction === 'outgoing'
                        : ['accepted', 'declined', 'cancelled'].includes(share.status),
              );
    const shares =
        tab === 'personal'
            ? []
            : candidates.filter(
                  (share) => tab === 'pending' || allMonths || share.date.slice(0, 7) === month,
              );
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">DIVIDIR, COM SIMPLICIDADE</span>
                    <h2>Contas compartilhadas</h2>
                    <p>Receba, confira e decida. Só sua parte entra nas suas finanças.</p>
                </div>
                <button
                    className="icon-btn"
                    aria-label="Atualizar compartilhamentos"
                    onClick={refreshSharing}
                >
                    <RefreshCw size={18} />
                </button>
            </div>
            <div className="tabs" role="tablist" aria-label="Contas compartilhadas">
                {(
                    [
                        ['pending', 'Para responder'],
                        ['received', 'Recebidas'],
                        ['sent', 'Enviadas'],
                        ['history', 'Histórico'],
                        ['personal', 'Controle pessoal'],
                    ] as const
                ).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                        {label}
                        {id === 'pending' && pending.length > 0 && (
                            <span className="tab-count">{pending.length}</span>
                        )}
                    </button>
                ))}
            </div>
            {sharingError && <p role="alert">{sharingError}</p>}
            {invitations > 0 && (
                <p className="notice">
                    <a href="#members">{invitations} convite(s) de vínculo para responder em Membros</a>
                </p>
            )}
            {tab === 'personal' && (
                <section className="card">
                    <h3>Quem pagou e como ficou a divisão</h3>
                    <p className="muted">
                        Seu controle do mês inclui membros com ou sem conta. Estes valores são calculados
                        pelas divisões registradas; não movimentam dinheiro.
                    </p>
                    {balances.length ? (
                        balances.map(([id, amount]) => (
                            <div className="insight-row" key={id}>
                                <span>
                                    {members.find((member) => member.id === id)?.name || 'Membro'}
                                    <small>
                                        {' '}
                                        ·{' '}
                                        {amount > 0 ? 'a receber' : amount < 0 ? 'a devolver' : 'equilibrado'}
                                    </small>
                                </span>
                                <strong>{currency(Math.abs(amount))}</strong>
                            </div>
                        ))
                    ) : (
                        <p className="empty-inline">Ainda não há despesas divididas no mês.</p>
                    )}
                </section>
            )}
            {tab !== 'pending' && tab !== 'personal' && (
                <label className="inline-check">
                    <input
                        type="checkbox"
                        checked={allMonths}
                        onChange={(event) => setAllMonths(event.target.checked)}
                    />{' '}
                    Incluir outros meses carregados
                </label>
            )}
            {tab !== 'personal' && !shares.length && (
                <div className="empty-state card">
                    {tab === 'pending' ? <Check size={28} /> : <Inbox size={28} />}
                    <h3>
                        {tab === 'pending'
                            ? 'Nenhuma conta aguardando sua resposta'
                            : 'Nenhuma conta neste filtro'}
                    </h3>
                    <p>
                        {hasMoreSharing
                            ? 'Há registros anteriores disponíveis abaixo.'
                            : 'Ao salvar uma despesa dividida, membros vinculados recebem o pedido automaticamente.'}
                    </p>
                    <a className="text-link" href="#members">
                        Gerenciar pessoas e vínculos
                    </a>
                </div>
            )}
            <div className="share-list">
                {shares.map((share) => (
                    <article className="card share-card" key={share.id}>
                        <div className="share-card-top">
                            <div className="share-person">
                                {share.direction === 'incoming' ? (
                                    <ArrowDownLeft size={17} />
                                ) : (
                                    <ArrowUpRight size={17} />
                                )}
                                <span>
                                    {share.direction === 'incoming'
                                        ? `De ${share.ownerName}`
                                        : `Para ${members.find((member) => member.id === share.memberId)?.name || 'membro'}`}
                                </span>
                            </div>
                            <span className={`sharing-badge status-${share.status}`}>
                                {labels[share.status]}
                            </span>
                        </div>
                        <div className="share-main">
                            <div>
                                <h3>{share.description}</h3>
                                <p>
                                    {new Date(share.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} ·{' '}
                                    {share.category || 'Outros'}
                                </p>
                                <div className="chip-list">
                                    {share.tags?.map((tag) => (
                                        <span className="chip" key={tag}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="share-amount">
                                <small>
                                    {share.direction === 'incoming' ? 'Sua parte' : 'Parte do membro'}
                                </small>
                                <strong>{currency(share.amount)}</strong>
                                <small>Total {currency(share.total)}</small>
                            </div>
                        </div>
                        {share.status === 'pending' && (
                            <div className="share-card-bottom">
                                {share.direction === 'incoming' ? (
                                    <>
                                        <p>
                                            {share.paidByRecipient
                                                ? 'Você foi indicado como pagador. Confira a divisão.'
                                                : 'Confira o valor antes de incluir no seu mês.'}
                                        </p>
                                        <div className="sharing-actions">
                                            <button
                                                className="btn-primary"
                                                disabled={isProcessing}
                                                onClick={() => void decideShare(share.id, 'accept')}
                                            >
                                                Aceitar conta
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                disabled={isProcessing}
                                                onClick={() => void decideShare(share.id, 'decline')}
                                            >
                                                Recusar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p>A conta entra nas finanças do membro após o aceite.</p>
                                        <button
                                            className="btn-secondary"
                                            disabled={isProcessing}
                                            onClick={() => void decideShare(share.id, 'cancel')}
                                        >
                                            Cancelar envio
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {share.status === 'accepted' && <ShareSettlement share={share} />}
                    </article>
                ))}
            </div>
            {tab !== 'personal' && hasMoreSharing && (
                <button className="btn-secondary" disabled={isLoadingMoreSharing} onClick={loadMoreSharing}>
                    {isLoadingMoreSharing ? 'Carregando…' : 'Carregar contas anteriores'}
                </button>
            )}
        </div>
    );
}

export function MemberConnectionActions({ memberId, email }: { memberId: string; email: string | null }) {
    const { sharing, inviteMember, decideConnection, isProcessing } = useFinance();
    const connection = sharing.connections.find(
        (link) => link.direction === 'outgoing' && link.memberId === memberId,
    );
    if (!connection)
        return (
            <div className="sharing-member">
                <span className="quiet-badge">Sem vínculo · controle pessoal</span>
                {email && (
                    <button
                        className="btn-secondary"
                        disabled={isProcessing}
                        onClick={() => void inviteMember(memberId)}
                    >
                        Convidar para vincular
                    </button>
                )}
            </div>
        );
    return (
        <div className="sharing-member">
            <span className={`sharing-badge status-${connection.status}`}>
                {connectionLabels[connection.status]}
            </span>
            {connection.status === 'expired' && (
                <button
                    className="btn-secondary"
                    disabled={isProcessing}
                    onClick={() => void inviteMember(memberId)}
                >
                    Renovar convite
                </button>
            )}
            {['pending', 'accepted'].includes(connection.status) && (
                <button
                    className="text-button"
                    disabled={isProcessing}
                    onClick={() => {
                        if (
                            confirm(
                                'Encerrar este vínculo? Contas aceitas serão preservadas e envios pendentes serão cancelados.',
                            )
                        )
                            void decideConnection(connection.id, 'revoke');
                    }}
                >
                    {connection.status === 'pending' ? 'Cancelar convite' : 'Encerrar vínculo'}
                </button>
            )}
        </div>
    );
}

export function ShareExpenseActions({
    sharedWith,
}: {
    transactionId: string;
    memberIds: string[];
    sharedWith?: Array<{ memberId: string; status: string }>;
}) {
    return sharedWith?.length ? (
        <a href="#sharing" className="text-link compact-link">
            {sharedWith.some((share) => share.status === 'pending')
                ? 'Aguardando aceite do membro'
                : 'Ver compartilhamento'}
        </a>
    ) : null;
}
