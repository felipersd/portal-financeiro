import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Users, Link2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { MemberConnectionActions } from './SharingCenter';
import type { GroupMember } from '../types';

export function MembersManager() {
    const {
        members,
        sharing,
        sharingError,
        addMember,
        updateMember,
        removeMember,
        decideConnection,
        isProcessing,
        hasMoreSharing,
        loadMoreSharing,
        isLoadingMoreSharing,
    } = useFinance();
    const [tab, setTab] = useState<'people' | 'invitations'>(() =>
        sharing.connections.some((link) => link.direction === 'incoming' && link.status === 'pending')
            ? 'invitations'
            : 'people',
    );
    const [form, setForm] = useState(false);
    const [editing, setEditing] = useState<string>();
    const [name, setName] = useState(''),
        [surname, setSurname] = useState(''),
        [email, setEmail] = useState(''),
        [category, setCategory] = useState('Pessoa');
    const outgoingPeers = new Set(
        sharing.connections
            .filter((link) => link.direction === 'outgoing' && link.status === 'accepted')
            .map((link) => link.peerKey),
    );
    const incoming = [
        ...new Map(
            sharing.connections
                .filter(
                    (link) =>
                        link.direction === 'incoming' &&
                        link.status === 'accepted' &&
                        !outgoingPeers.has(link.peerKey),
                )
                .map((link) => [link.peerKey || link.id, link]),
        ).values(),
    ];
    const invites = sharing.connections.filter(
        (link) => link.direction === 'incoming' && link.status === 'pending',
    );
    function reset() {
        setName('');
        setSurname('');
        setEmail('');
        setCategory('Pessoa');
        setEditing(undefined);
        setForm(false);
    }
    function edit(member: GroupMember) {
        setName(member.name);
        setSurname(member.surname || '');
        setEmail(member.email || '');
        setCategory(member.category);
        setEditing(member.id);
        setForm(true);
    }
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">PESSOAS, NÃO COMPLICAÇÕES</span>
                    <h2>Quem divide com você</h2>
                    <p>
                        Com ou sem conta no Portal. Seus vínculos ficam aqui; as despesas, em
                        Compartilhamentos.
                    </p>
                </div>
                <button
                    className="btn-primary"
                    disabled={members.length >= 10}
                    onClick={() => {
                        reset();
                        setForm(true);
                        setTab('people');
                    }}
                >
                    <UserPlus size={17} /> Adicionar pessoa
                </button>
            </div>
            <div className="tabs" role="tablist" aria-label="Pessoas e convites">
                <button role="tab" aria-selected={tab === 'people'} onClick={() => setTab('people')}>
                    Minhas pessoas
                </button>
                <button
                    role="tab"
                    aria-selected={tab === 'invitations'}
                    onClick={() => setTab('invitations')}
                >
                    Convites recebidos
                    {invites.length > 0 && <span className="tab-count">{invites.length}</span>}
                </button>
            </div>
            {sharingError && <p role="alert">{sharingError}</p>}
            {tab === 'people' ? (
                <>
                    {form && (
                        <section className="card">
                            <div className="section-heading">
                                <h3>{editing ? 'Editar pessoa' : 'Uma nova pessoa no seu controle'}</h3>
                            </div>
                            <form
                                className="page-stack"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    const saved = editing
                                        ? await updateMember(
                                              editing,
                                              name,
                                              surname || undefined,
                                              email || undefined,
                                              category,
                                          )
                                        : await addMember(
                                              name,
                                              surname || undefined,
                                              email || undefined,
                                              category,
                                          );
                                    if (saved) reset();
                                }}
                            >
                                <div className="form-row">
                                    <label htmlFor="member-name">
                                        Nome
                                        <input
                                            id="member-name"
                                            required
                                            maxLength={80}
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                        />
                                    </label>
                                    <label htmlFor="member-surname">
                                        Sobrenome · opcional
                                        <input
                                            id="member-surname"
                                            maxLength={80}
                                            value={surname}
                                            onChange={(event) => setSurname(event.target.value)}
                                        />
                                    </label>
                                </div>
                                <div className="form-row">
                                    <label htmlFor="member-email">
                                        E-mail · opcional
                                        <input
                                            id="member-email"
                                            type="email"
                                            maxLength={254}
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="Para convidar uma conta do Portal"
                                        />
                                    </label>
                                    <label htmlFor="member-category">
                                        Como vocês se conhecem
                                        <select
                                            id="member-category"
                                            value={category}
                                            onChange={(event) => setCategory(event.target.value)}
                                        >
                                            {[
                                                ...new Set([
                                                    'Pessoa',
                                                    'Família',
                                                    'Amigo(a)',
                                                    'Cônjuge',
                                                    'Colega',
                                                    category,
                                                ]),
                                            ].map((value) => (
                                                <option key={value}>{value}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <p className="muted">
                                    O e-mail não é obrigatório. O convite para vincular será uma escolha sua
                                    depois de salvar.
                                </p>
                                <div className="sharing-actions">
                                    <button className="btn-primary" disabled={isProcessing}>
                                        Salvar pessoa
                                    </button>
                                    <button type="button" className="btn-secondary" onClick={reset}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                    <div className="people-grid">
                        {members.map((member) => (
                            <article className="card person-card" key={member.id}>
                                <div className="person-heading">
                                    <span className="avatar">{member.name[0]}</span>
                                    <div>
                                        <h3>
                                            {member.name} {member.surname}
                                        </h3>
                                        <p>{member.category}</p>
                                    </div>
                                    <button
                                        className="icon-btn"
                                        aria-label={`Editar ${member.name}`}
                                        onClick={() => edit(member)}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </div>
                                {member.email && <p className="person-email">{member.email}</p>}
                                <MemberConnectionActions memberId={member.id} email={member.email} />
                                <div className="person-footer">
                                    <a className="text-button" href="#sharing">
                                        Ver contas compartilhadas
                                    </a>
                                    <button
                                        className="icon-btn"
                                        aria-label={`Remover ${member.name}`}
                                        disabled={isProcessing}
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    'Remover esta pessoa? Quem já participa de lançamentos será preservado para manter seu histórico.',
                                                )
                                            )
                                                void removeMember(member.id);
                                        }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </article>
                        ))}
                        {incoming.map((link) => (
                            <article className="card person-card" key={link.id}>
                                <div className="person-heading">
                                    <span className="avatar">
                                        <Link2 size={18} />
                                    </span>
                                    <div>
                                        <h3>{link.ownerName}</h3>
                                        <p>Vínculo recebido</p>
                                    </div>
                                </div>
                                <p className="person-email">Pode enviar contas para o seu aceite.</p>
                                <span className="sharing-badge status-accepted">Vínculo ativo</span>
                                <div className="person-footer">
                                    <a href="#sharing" className="text-button">
                                        Ver contas recebidas
                                    </a>
                                    <button
                                        className="text-button"
                                        disabled={isProcessing}
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    'Encerrar este vínculo? Contas aceitas serão preservadas.',
                                                )
                                            )
                                                void decideConnection(link.id, 'revoke');
                                        }}
                                    >
                                        Encerrar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                    {!members.length && !incoming.length && (
                        <div className="empty-state card">
                            <Users size={28} />
                            <h3>Dividir começa com uma pessoa</h3>
                            <p>Adicione alguém para organizar despesas em conjunto, mesmo sem cadastro.</p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {!invites.length && (
                        <div className="empty-state card">
                            <Link2 size={28} />
                            <h3>Nenhum convite por enquanto</h3>
                            <p>Quando alguém convidar seu e-mail verificado, o pedido aparecerá aqui.</p>
                        </div>
                    )}
                    {invites.map((link) => (
                        <article className="card invitation-card" key={link.id}>
                            <div>
                                <h3>{link.ownerName}</h3>
                                <p className="muted">
                                    Quer enviar contas para dividir com você. Cada despesa ainda precisa do
                                    seu aceite.
                                </p>
                            </div>
                            <div className="sharing-actions">
                                <button
                                    className="btn-primary"
                                    disabled={isProcessing}
                                    onClick={() => void decideConnection(link.id, 'accept')}
                                >
                                    Aceitar vínculo
                                </button>
                                <button
                                    className="btn-secondary"
                                    disabled={isProcessing}
                                    onClick={() => void decideConnection(link.id, 'decline')}
                                >
                                    Recusar
                                </button>
                            </div>
                        </article>
                    ))}
                </>
            )}
            {hasMoreSharing && (
                <button className="btn-secondary" disabled={isLoadingMoreSharing} onClick={loadMoreSharing}>
                    Carregar vínculos anteriores
                </button>
            )}
        </div>
    );
}
