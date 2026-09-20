import { ShareSettlement } from './ShareSettlement';
import { useFinance } from '../context/FinanceContext';
import { currency } from '../utils/money';
import './sharing.css';

const labels: Record<string, string> = { pending: 'Aguardando aceite', accepted: 'Aceito', declined: 'Recusado',
    revoked: 'Vínculo encerrado', expired: 'Convite expirado', cancelled: 'Cancelado' };

export function SharingCenter() {
    const { sharing, sharingError, isProcessing, decideConnection, decideShare, refreshSharing, members } = useFinance();
    const incoming = sharing.connections.filter(c => c.direction === 'incoming' && ['pending', 'accepted'].includes(c.status));
    const shares = sharing.shares;
    return <section className="sharing-center" aria-label="Convites e contas compartilhadas">
        <div className="sharing-heading"><div><h2>Compartilhar com tranquilidade</h2>
            <p>Você aceita o vínculo e escolhe cada conta que entra nas suas finanças. Seus outros lançamentos continuam privados.</p></div>
            <button type="button" className="btn-secondary" onClick={refreshSharing}>Atualizar</button></div>
        {sharingError && <p role="alert">{sharingError}</p>}
        {incoming.map(c => <article className="card sharing-item" key={c.id}>
            <div><h3>{c.ownerName}</h3><p>{c.status === 'pending' ? 'Quer dividir contas com você. Aceitar o vínculo não aceita nenhuma despesa.' : 'Vínculo ativo. Cada nova conta ainda precisa do seu aceite.'}</p></div>
            <div className="sharing-actions">
                {c.status === 'pending' ? <><button className="btn-primary" disabled={isProcessing} onClick={() => void decideConnection(c.id, 'accept')}>Aceitar vínculo</button>
                    <button className="btn-secondary" disabled={isProcessing} onClick={() => void decideConnection(c.id, 'decline')}>Recusar</button></> :
                    <button className="btn-secondary" disabled={isProcessing} onClick={() => { if (confirm('Encerrar o vínculo? Convites de contas pendentes serão cancelados. Contas já aceitas permanecem no histórico.')) void decideConnection(c.id, 'revoke'); }}>Encerrar vínculo</button>}
            </div>
        </article>)}
        <h3>Contas enviadas e recebidas</h3>
        <p>Somente sua parte entra no seu saldo após o aceite. As contas aceitas preservam o valor combinado; o aceite não representa pagamento.</p>
        {!shares.length && <p className="sharing-empty">Nenhuma conta compartilhada ainda. Vincule um membro e envie uma conta dividida pela lista de lançamentos.</p>}
        {shares.map(s => <article className="card sharing-item" key={s.id}>
            <div><span className={`sharing-badge status-${s.status}`}>{labels[s.status]}</span>
                <h3>{s.description}</h3>
                <p>{s.direction === 'incoming' ? `De ${s.ownerName}` : `Para ${members.find(m => m.id === s.memberId)?.name || 'membro'}`} · {new Date(s.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                <p><strong>{s.direction === 'incoming' ? 'Sua parte' : 'Parte do membro'}: {currency(s.amount)}</strong> · Total da conta: {currency(s.total)}</p>
                {s.direction === 'incoming' && s.status === 'pending' && <p>{s.paidByRecipient ? 'Você foi indicado como pagador. Confira antes de aceitar.' : 'Confira o valor e a descrição antes de aceitar.'}</p>}
            </div>
            {s.status === 'accepted' && <ShareSettlement share={s} />}
            {s.status === 'pending' && <div className="sharing-actions">
                {s.direction === 'incoming' ? <><button className="btn-primary" disabled={isProcessing} onClick={() => void decideShare(s.id, 'accept')}>Aceitar conta</button>
                    <button className="btn-secondary" disabled={isProcessing} onClick={() => void decideShare(s.id, 'decline')}>Recusar conta</button></> :
                    <button className="btn-secondary" disabled={isProcessing} onClick={() => void decideShare(s.id, 'cancel')}>Cancelar envio</button>}
            </div>}
        </article>)}
    </section>;
}

export function MemberConnectionActions({ memberId, email }: { memberId: string; email: string | null }) {
    const { sharing, inviteMember, decideConnection, isProcessing } = useFinance();
    const connection = sharing.connections.find(c => c.direction === 'outgoing' && c.memberId === memberId);
    if (!connection) return <div className="sharing-member"><span>Membro local · funciona sem conta</span>{email &&
        <button className="btn-secondary" disabled={isProcessing} onClick={() => void inviteMember(memberId)}>Convidar para vincular conta</button>}</div>;
    return <div className="sharing-member"><span className={`sharing-badge status-${connection.status}`}>{labels[connection.status]}</span>
        {connection.status === 'expired' && <button className="btn-secondary" disabled={isProcessing} onClick={() => void inviteMember(memberId)}>Renovar convite</button>}
        {connection.status === 'pending' && <small>Convite disponível no Portal ao entrar com {connection.email}. Válido por 7 dias.</small>}
        {['pending', 'accepted'].includes(connection.status) && <button className="btn-secondary" disabled={isProcessing} onClick={() => {
            if (confirm('Encerrar este vínculo? Contas já aceitas serão preservadas e as pendentes serão canceladas.')) void decideConnection(connection.id, 'revoke');
        }}>{connection.status === 'pending' ? 'Cancelar convite' : 'Encerrar vínculo'}</button>}
    </div>;
}

export function ShareExpenseActions({ transactionId, memberIds }: { transactionId: string; memberIds: string[] }) {
    const { sharing, members, shareExpense, isProcessing } = useFinance();
    const linked = sharing.connections.filter(c => c.direction === 'outgoing' && c.status === 'accepted' && c.memberId && memberIds.includes(c.memberId));
    return <div className="sharing-actions">{linked.map(c => {
        const share = sharing.shares.find(s => s.transactionId === transactionId && s.memberId === c.memberId);
        const name = members.find(m => m.id === c.memberId)?.name || 'membro';
        return share ? <span className="sharing-badge" key={c.id}>{name}: {labels[share.status]}</span> :
            <button key={c.id} className="btn-secondary" disabled={isProcessing} onClick={() => void shareExpense(transactionId, c.memberId!)}>Enviar para aceite de {name}</button>;
    })}</div>;
}
