import { useState } from 'react';
import { Bell, CheckCheck, Smartphone } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { NotificationItem } from '../types';

const messages: Record<string, string> = {
    expense_received: 'Uma conta foi enviada para seu aceite.',
    expense_accepted: 'Uma conta que você enviou foi aceita.',
    expense_declined: 'Uma conta que você enviou foi recusada.',
    expense_cancelled: 'O envio de uma conta foi cancelado.',
    correction_received: 'Uma proposta de correção espera sua resposta.',
    correction_updated: 'Uma proposta de correção foi atualizada.',
};

export function PushPreferences() {
    const { getPushKey, subscribePush, unsubscribePush, isProcessing } = useFinance();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    async function enable() {
        setBusy(true);
        setMessage('');
        try {
            // Permission requests belong to this explicit user gesture, never an effect.
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setMessage('Você pode permitir notificações nas configurações do navegador.');
                return;
            }
            const { publicKey } = await getPushKey();
            if (!publicKey) {
                setMessage('As notificações deste servidor ainda estão sendo configuradas.');
                return;
            }
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (character) =>
                character.charCodeAt(0),
            );
            const subscription =
                (await registration.pushManager.getSubscription()) ||
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: key,
                }));
            if (await subscribePush(subscription.toJSON()))
                setMessage('Notificações ativadas neste dispositivo.');
        } catch {
            setMessage(
                'Não foi possível ativar. No iPhone, adicione o Portal à Tela de Início e abra por esse ícone.',
            );
        } finally {
            setBusy(false);
        }
    }
    async function disable() {
        setBusy(true);
        try {
            const subscription = await (
                await navigator.serviceWorker.getRegistration()
            )?.pushManager.getSubscription();
            if (subscription) {
                if (!(await unsubscribePush(subscription.endpoint))) {
                    setMessage('Não foi possível desativar. Tente novamente.');
                    return;
                }
                await subscription.unsubscribe();
            }
            setMessage('Notificações desativadas neste dispositivo.');
        } catch {
            setMessage('Não foi possível desativar. Tente novamente.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="card">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">NO SEU TEMPO</span>
                    <h3>
                        <Smartphone size={20} /> Avisos neste dispositivo
                    </h3>
                </div>
            </div>
            <p className="muted">
                Receba avisos sobre contas e correções. Valores e nomes não aparecem na tela bloqueada.
            </p>
            <p className="chart-note">
                No iPhone, abra o Portal pelo ícone adicionado à Tela de Início. A disponibilidade depende do
                navegador e do sistema.
            </p>
            <div className="sharing-actions">
                <button
                    className="btn-primary"
                    disabled={!supported || busy || isProcessing}
                    onClick={() => void enable()}
                >
                    <Bell size={17} /> Ativar notificações
                </button>
                <button
                    className="btn-secondary"
                    disabled={!supported || busy || isProcessing}
                    onClick={() => void disable()}
                >
                    Desativar neste aparelho
                </button>
            </div>
            {!supported && (
                <p className="notice">
                    Este navegador não oferece push. Seus avisos continuam disponíveis no Portal.
                </p>
            )}
            {message && (
                <p role="status" className="notice">
                    {message}
                </p>
            )}
        </section>
    );
}

export function NotificationCenter() {
    const { notifications, notificationsError, loadNotifications, readNotifications, isProcessing } =
        useFinance();
    const [older, setOlder] = useState<NotificationItem[]>([]);
    const [cursor, setCursor] = useState<string | null | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const items = [...new Map([...notifications.items, ...older].map((item) => [item.id, item])).values()];
    const next = cursor === undefined ? notifications.nextCursor : cursor;
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">ACOMPANHE</span>
                    <h2>Suas notificações</h2>
                    <p>O que mudou nas contas que vocês dividem.</p>
                </div>
                <button
                    className="btn-secondary"
                    disabled={isProcessing || !notifications.unread}
                    onClick={() =>
                        void readNotifications(
                            notifications.items.filter((item) => !item.readAt).map((item) => item.id),
                        )
                    }
                >
                    <CheckCheck size={17} /> Marcar recentes como lidas
                </button>
            </div>
            {notificationsError && (
                <p className="notice" role="alert">
                    Não foi possível atualizar os avisos: {notificationsError}
                </p>
            )}
            <section className="card notification-list">
                {!items.length ? (
                    <div className="empty-state">
                        <Bell size={28} />
                        <h3>Tudo tranquilo por aqui</h3>
                        <p>Novidades dos seus compartilhamentos aparecerão neste espaço.</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <a
                            href="#sharing"
                            key={item.id}
                            className={!item.readAt ? 'unread' : ''}
                            onClick={() => void readNotifications([item.id])}
                        >
                            <span className="icon-tile">
                                <Bell size={18} />
                            </span>
                            <div>
                                <strong>
                                    {messages[item.kind] || 'Há uma atualização nos seus compartilhamentos.'}
                                </strong>
                                <small>
                                    {new Date(item.createdAt).toLocaleString('pt-BR', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                    })}
                                </small>
                            </div>
                            {!item.readAt && <i className="unread-dot" />}
                        </a>
                    ))
                )}
                {next && (
                    <button
                        className="btn-secondary"
                        disabled={loading}
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const page = await loadNotifications(next);
                                setOlder((previous) => [...previous, ...page.items]);
                                setCursor(page.nextCursor);
                            } catch {
                                setError('Não foi possível carregar os avisos.');
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        Avisos anteriores
                    </button>
                )}
                {error && <p role="alert">{error}</p>}
            </section>
            <PushPreferences />
        </div>
    );
}
