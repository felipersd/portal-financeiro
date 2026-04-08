import { useEffect, useRef, useState } from 'react';

// Adicionando a tipagem silenciosa pro objeto global do AdSense na window
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slotId?: string; // Permitir que o slot seja sobrescrito se quiserem múltiplos anúncios em diferentes posições
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
}

export const AdBanner = ({ slotId, format = 'auto', responsive = true }: AdBannerProps) => {
  const isDev = import.meta.env.DEV;
  // Fallbacks: Se as variáveis não existirem no `.env`, nós impedimos o componente de quebrar em produção
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-PROVISORIO';
  const finalSlotId = slotId || import.meta.env.VITE_ADSENSE_SLOT_ID || 'SLOT-PROVISORIO';

  const adRef = useRef<HTMLModElement>(null);
  const isPushed = useRef(false);
  
  // Controle de Consentimento LGPD
  const [hasConsentChoice, setHasConsentChoice] = useState(false);
  const [allowMarketing, setAllowMarketing] = useState(false);

  useEffect(() => {
    const checkPreferences = () => {
      const prefsString = localStorage.getItem('cookie-preferences');
      if (prefsString) {
        try {
          const prefs = JSON.parse(prefsString);
          setAllowMarketing(prefs.marketing === true);
          setHasConsentChoice(true);
        } catch (e) {
          // ignore parsing error
        }
      }
    };

    // Checa ao inicializar
    checkPreferences();

    // Fica escutando recálculos do painel LGPD
    window.addEventListener('cookie-preferences-updated', checkPreferences);
    return () => window.removeEventListener('cookie-preferences-updated', checkPreferences);
  }, []);

  useEffect(() => {
    // LGPD: Jamais carregar scripts de Adsense antes de qualquer consentimento
    if (!hasConsentChoice) return;
    
    // Evita crashes caso o blocker do navegador mate o script ou estejamos em server-side no futuro
    if (typeof window !== 'undefined') {
      try {
        window.adsbygoogle = window.adsbygoogle || [];

        // Modo Estrito LGPD/GDPR: Se o marketing foi negado, desliga a personalização ANTES de requisitar o anúncio
        if (!allowMarketing) {
          // @ts-expect-error Padrão de API do AdSense para Non-Personalized Ads
          window.adsbygoogle.requestNonPersonalizedAds = 1;
        }

        // Injeta a tag do script se ainda não existir
        const scriptId = 'adsense-script';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }

        // Evita que o React Strict Mode (que roda o useEffect duas vezes no localhost) 
        // chame o push() do AdSense numa área já preenchida
        if (!isPushed.current) {
          isPushed.current = true;
          // Deferir o push levemente para garantir que o contêiner ins esteja no DOM
          setTimeout(() => {
            if (adRef.current && adRef.current.innerHTML === "") {
               (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
          }, 100);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          // Ignorar silenciosamente bloqueadores de anúncios (AdBlockers)
          if (!e.message.includes('adsbygoogle')) {
             console.error('AdSense Initialization Error:', e.message);
          }
        }
      }
    }
  }, [clientId, hasConsentChoice, allowMarketing]);

  // Se o consentimento ainda está pendente, retorna uma área vazia
  if (!hasConsentChoice) return null;

  // Se estivermos no modo local de desenvolvimento e não houver ClientID de produção configurado ainda
  if (isDev && clientId === 'ca-pub-PROVISORIO') {
    return (
      <div 
        style={{
          width: '100%', 
          minHeight: '100px', 
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px dashed rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          borderRadius: '12px',
          margin: '2rem 0',
          fontSize: '0.875rem'
        }}
      >
        [Área Reservada para Google AdSense]<br/>
        <small style={{opacity: 0.5}}>(Preencha as Variáveis VITE_ADSENSE_CLIENT_ID e VITE_ADSENSE_SLOT_ID nas Envs)</small>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center', margin: '2rem 0', minHeight: '100px' }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={finalSlotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
};
