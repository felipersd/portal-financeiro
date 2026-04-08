import React from 'react';

export const TermsOfService: React.FC = () => {
    return (
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Termos de Uso</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            
            <section style={{ marginBottom: '1.5rem' }}>
                <h4>1. Aceitação dos Termos</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Ao acessar e utilizar o Portal Financeiro, você concorda expressamente com estes Termos de Uso. Se você não concorda com qualquer parte destes termos, você não deve utilizar nosso serviço.
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>2. Natureza Informativa do Serviço</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    O Portal Financeiro é uma ferramenta para auxiliar o usuário no controle e organização de suas finanças pessoais. O portal <strong>NÃO</strong> realiza integrações com instituições bancárias, não faz investimentos, não concede créditos e não presta consultoria financeira. Os dados aqui inseridos são de responsabilidade exclusiva do usuário e servem puramente para referência pessoal.
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>3. Isenção de Responsabilidade</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Nós nos isentamos de qualquer responsabilidade por prejuízos, danos financeiros, perda de lucros, decisões tomadas ou falhas decorrentes do uso da plataforma ou de imprecisões nos dados inseridos, bugs de arredondamento matemático ou indisponibilidade temporária do serviço. O serviço é restrito ao contexto de organização da informação, fornecido "no estado em que se encontra" (As-Is).
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>4. Obrigações e Conduta do Usuário</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    O usuário se compromete a fornecer informações verdadeiras para sua conta, a não utilizar a plataforma para atividades ilícitas e a preservar e manter segura a própria senha perante a empresa de autenticação que provê nossos serviços de login (Clerk).
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>5. Interrupção ou Encerramento</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Reservamo-nos o direito de modificar, suspender ou descontinuar o serviço a qualquer momento, com ou sem aviso prévio, caso detectemos uso indevido da infraestrutura ou abandono do projeto corporativo.
                </p>
            </section>

            <div style={{ marginTop: '3rem', padding: '1rem', border: '1px dashed var(--danger)', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)' }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    <strong>Atenção Administrador:</strong> Estes Termos de Uso são um modelo padrão prévio. Assegure-se de revisá-los adequadamente de acordo com o escopo da legislação local da qual sua empresa está lotada e incluir dados concretos de contato ou CNPJ/CPF da operação.
                </p>
            </div>
        </div>
    );
};
