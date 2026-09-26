import { useClerk } from '@clerk/clerk-react';
import { ShieldCheck, UserRound } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PushPreferences } from './NotificationCenter';

export function ProfileSettings() {
    const { user } = useFinance();
    const { openUserProfile } = useClerk();
    return (
        <div className="page-stack settings-width">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">SUA CONTA</span>
                    <h2>Você no controle</h2>
                    <p>Seu perfil, sua segurança e suas preferências.</p>
                </div>
            </div>
            <section className="card profile-card">
                <div className="avatar large">
                    {user?.avatar ? <img src={user.avatar} alt="" /> : <UserRound />}
                </div>
                <div>
                    <h3>{user?.name}</h3>
                    <p className="muted">{user?.email}</p>
                </div>
                <button className="btn-primary" onClick={() => openUserProfile()}>
                    Editar perfil
                </button>
            </section>
            <section className="card">
                <div className="section-heading">
                    <h3>
                        <ShieldCheck size={20} /> Acesso e segurança
                    </h3>
                </div>
                <p className="muted">
                    Altere foto, nome, e-mail, senha e confira suas sessões. As verificações necessárias são
                    feitas pelo nosso provedor de autenticação.
                </p>
                <button className="btn-secondary" onClick={() => openUserProfile()}>
                    Gerenciar minha conta
                </button>
            </section>
            <PushPreferences />
        </div>
    );
}
