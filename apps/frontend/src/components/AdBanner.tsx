import { useEffect, useRef } from 'react';

// Adicionando a tipagem silenciosa pro objeto global do AdSense na window
declare global {
  interface Window {
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

  useEffect(() => {
    // Evita crashes caso o blocker do navegador mate o script ou estejamos em server-side no futuro
    if (typeof window !== 'undefined') {
      try {
        // Empurra (Push) a ativação do banner após a renderização do bloco
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e: any) {
        console.error('AdSense Initialization Error:', e.message);
      }
    }
  }, []); // [] Garante que ative apenas uma vez quando a SPA carregar esse componente

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
    <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center', margin: '2rem 0' }}>
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
