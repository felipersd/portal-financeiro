import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { ArrowRight, ShieldCheck, Users, ChartNoAxesCombined } from 'lucide-react';
import { Brand } from './Brand';
export function Login() {
    return (
        <main className="login-page">
            <section className="login-story">
                <Brand />
                <div>
                    <span className="eyebrow">SEU DIA A DIA, MAIS LEVE</span>
                    <h1>
                        Seu dinheiro.
                        <br />
                        Suas escolhas.
                        <br />
                        <em>Mais clareza.</em>
                    </h1>
                    <p>Organize o mês, entenda seus gastos e divida contas com quem faz parte da sua vida.</p>
                    <div className="login-features">
                        <span>
                            <Users size={18} /> Contas compartilhadas, com aceite
                        </span>
                        <span>
                            <ChartNoAxesCombined size={18} /> Um olhar completo para o seu mês
                        </span>
                    </div>
                </div>
                <small>Portal Financeiro · Feito para a vida real</small>
            </section>
            <section className="login-panel">
                <div>
                    <span className="eyebrow">BEM-VINDO AO SEU PORTAL</span>
                    <h2>Vamos cuidar do seu mês?</h2>
                    <p>Entre na sua conta para continuar de onde parou.</p>
                    <SignInButton mode="modal" fallbackRedirectUrl="/">
                        <button className="btn-primary">
                            Entrar na minha conta <ArrowRight size={18} />
                        </button>
                    </SignInButton>
                    <SignUpButton mode="modal" fallbackRedirectUrl="/">
                        <button className="btn-secondary">Criar uma conta</button>
                    </SignUpButton>
                    <small>
                        <ShieldCheck size={15} /> Seus lançamentos são privados. Você escolhe o que dividir.
                    </small>
                </div>
            </section>
        </main>
    );
}
