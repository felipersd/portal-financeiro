import React from 'react';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div
            style={{
                background: 'var(--bg-card)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
            }}
        >
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Política de Privacidade</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                Última atualização: 25/09/2026
            </p>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>1. Informações que Coletamos</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Coletamos e armazenamos as informações que você insere intencionalmente para usar a
                    aplicação, tais como as configurações de orçamento, as transações (valor, data e título),
                    categorias e tags, divisões de despesas, dados cadastrais básicos utilizados pelo seu
                    provedor de identificação (nome, email fornecidos na criação de conta via serviço Clerk).
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>2. Uso da Informação</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Os dados sobre orçamentos e despesas são de uso vital para o cômputo e processamento
                    dentro dos painéis da ferramenta, não sendo utilizados ou vendidos para compor lista de
                    métricas por nosso estúdio para empresas não-associadas e terceiros, resguardados os
                    sigilos sob a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018).
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>3. Publicidade de Terceiros e AdSense (Consentimento de Cookies)</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Esta plataforma pode utilizar tecnologias de publicidade de terceiros, como o{' '}
                    <strong>Google AdSense</strong>. Esses fornecedores, que incluem o Google, usam cookies
                    para veicular anúncios na plataforma com base em visitas anteriores feitas neste ou em
                    outros sites.
                </p>
                <ul style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                    <li>
                        <small>
                            O uso de cookies do Google permite a eles e aos seus parceiros a veiculação de
                            dados sob medida.
                        </small>
                    </li>
                    <li>
                        <small>
                            Você tem o poder de acessar as Configurações de anúncios do Google na sua própria
                            Conta Google ou através do site www.aboutads.info, ou usar seu bloqueador de
                            rastreio em seus navegadores, caso deseje restringir que nós e as plataformas
                            terceiras manipulemos perfis sobre você.
                        </small>
                    </li>
                </ul>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>4. Sobre o Serviço de Autenticação (Clerk)</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    A gestão de autorização e do seu cadastro é feita via provedor Clerk. Por isso, parte do
                    processamento da conta segue os Termos de Privacidade daquela operadora (Clerk).
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>5. Exclusão da conta e dos dados</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Caso o usuário opte por descontinuar o uso da ferramenta, nossa plataforma permite ao
                    solicitante realizar sua exclusão permanente. A exclusão é propagada para o banco do
                    Portal. Cópias de segurança seguem a retenção operacional e não são utilizadas na
                    navegação normal.
                </p>
            </section>

            <section style={{ marginBottom: '1.5rem' }}>
                <h4>6. Compartilhamentos e notificações</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Ao dividir uma despesa com uma pessoa vinculada, enviamos a ela a descrição, a data, a
                    categoria, as tags, o valor total e sua parte para aceite ou recusa. Os demais lançamentos
                    da sua conta permanecem privados. Membros sem vínculo ficam somente no seu controle
                    pessoal.
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Se você ativar notificações, armazenamos a inscrição deste navegador para enviar avisos
                    pelo serviço de push do dispositivo. Os avisos externos não contêm nomes, descrições ou
                    valores financeiros. Você pode desativá-los em Minha conta. Os avisos no Portal são
                    mantidos por até 90 dias. Telefone e endereço não são solicitados nesta versão.
                </p>
            </section>
        </div>
    );
};
