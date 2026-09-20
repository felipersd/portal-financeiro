import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import type { SharingState, ShareHistoryPage } from '../types';
import { currency } from '../utils/money';
const names = { adjustment: 'Correção da parte', payment: 'Pagamento', refund: 'Devolução' };
const statusNames: Record<string,string> = {pending:'Pendente',accepted:'Confirmado',declined:'Recusado',cancelled:'Cancelado'};
export function ShareSettlement({share}:{share:SharingState['shares'][number]}) {
 const { proposeShareChange, decideProposal, getShareHistory, isProcessing } = useFinance();
 const [kind,setKind] = useState<'adjustment'|'payment'|'refund'>('payment');
 const [amount,setAmount] = useState('');
 const [history,setHistory] = useState<ShareHistoryPage|null>(null);
 const [historyError,setHistoryError] = useState('');
 const [loading,setLoading] = useState(false);
 async function loadHistory(more=false) {
  if(loading) return;
  setLoading(true); setHistoryError('');
  try { const page=await getShareHistory(share.id,more ? history?.nextCursor || undefined : undefined);
   setHistory({items:more?[...(history?.items||[]),...page.items]:page.items,nextCursor:page.nextCursor});
  } catch {setHistoryError('Não foi possível carregar o histórico. Tente novamente.');}
  finally {setLoading(false);}
 }
 return <div className="share-settlement">
  {share.debtor !== 'thirdParty' && <p>{share.debtor==='me'?'Você tem a pagar':'Você tem a receber'}: <strong>{currency((share.settlementAmount||0)-(share.paidAmount||0))}</strong><br/>Pagamentos confirmados: {currency(share.paidAmount||0)}</p>}
  {share.proposal ? <div><p><strong>{names[share.proposal.kind]}</strong>: {currency(share.proposal.amount)}<br/>{share.proposal.proposedByMe?'Aguardando confirmação da outra pessoa.':'Confira a proposta antes de confirmar.'}</p>
   <div className="sharing-actions">{share.proposal.proposedByMe ? <button className="btn-secondary" disabled={isProcessing} onClick={()=>void decideProposal(share.proposal!.id,'cancel')}>Cancelar proposta</button> : <>
    <button className="btn-primary" disabled={isProcessing} onClick={()=>void decideProposal(share.proposal!.id,'accept')}>Confirmar acerto</button>
    <button className="btn-secondary" disabled={isProcessing} onClick={()=>void decideProposal(share.proposal!.id,'decline')}>Recusar acerto</button></>}</div></div> : share.canAdjust && <details>
    <summary>Registrar pagamento ou propor correção</summary>
    <p>Este registro não transfere dinheiro. Pagamentos, devoluções e correções precisam da confirmação de vocês dois. Corrigir para zero retira sua parte da conta; o total original é preservado.</p>
    <form onSubmit={async e=>{e.preventDefault();if(await proposeShareChange(share.id,kind,Number(amount)))setAmount('');}}>
     <label htmlFor={`kind-${share.id}`}>Tipo de acerto</label>
     <select id={`kind-${share.id}`} value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>
      <option value="payment">Confirmar pagamento</option><option value="refund">Confirmar devolução</option><option value="adjustment">Corrigir valor da parte</option>
     </select>
     <label htmlFor={`amount-${share.id}`}>{kind==='adjustment'?'Novo valor da parte do membro (R$)':'Valor (R$)'}</label>
     <input id={`amount-${share.id}`} type="number" min={kind==='adjustment'?0:0.01} max={share.total} step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/>
     <button className="btn-primary" disabled={isProcessing}>Enviar proposta</button>
    </form>
   </details>}
  <button className="btn-secondary" disabled={loading} onClick={()=>void loadHistory()}>Ver histórico de acertos</button>
  {historyError && <p role="alert">{historyError}</p>}
  {history && <div aria-live="polite">{!history.items.length&&<p>Nenhum acerto registrado.</p>}{history.items.map(item=><p key={item.id}>{names[item.kind]} · {currency(item.amount)} · {statusNames[item.status]}<br/>{item.proposedByMe?'Proposto por você':'Proposto pela outra pessoa'} em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>)}
   {history.nextCursor&&<button className="btn-secondary" disabled={loading} onClick={()=>void loadHistory(true)}>Mais acertos</button>}</div>}
 </div>;
}
