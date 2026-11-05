import { ArrowDownUp, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { useBetSlip } from './BetSlipContext';

export function BetSlip({onClose, onMyBets, onUnavailable}: {onClose:()=>void; onMyBets:()=>void; onUnavailable:()=>void}) {
  const { selections, setSelections, stake, setStake, slipTab, setSlipTab } = useBetSlip();
  const value = Number(stake);
  const validStake = Number.isFinite(value) && value > 0;
  const totalOdds = selections.reduce((n,s) => n * s.event.odds[s.pick],1);
  const returns = validStake ? (slipTab === 'Multiple' ? value * totalOdds : value * selections.reduce((n,s) => n+s.event.odds[s.pick],0)) : 0;
  return <>
    <div className="slip-head"><div><span className="slip-icon"><ArrowDownUp size={16}/></span><strong>Bet Slip</strong><span className="count">{selections.length}</span></div><button onClick={() => onClose()} className="close-mobile" aria-label="Close bet slip"><X size={18}/></button><button className="my-bets" onClick={() => onMyBets()}>My Bets <ChevronRight size={14}/></button></div>
    <div className="slip-tabs"><button className={slipTab==='Single'?'active':''} onClick={()=>setSlipTab('Single')}>Single</button><button className={slipTab==='Multiple'?'active':''} onClick={()=>setSlipTab('Multiple')}>Multiple <span>{selections.length}</span></button></div>
    {selections.length === 0 ? <div className="empty-slip"><div className="ticket-art"><ArrowDownUp size={26}/></div><strong>Your bet slip is empty</strong><p>Tap on the odds to add a selection to your bet slip.</p></div> : <div className="slip-content"><div className="slip-clear"><span>{selections.length} selection{selections.length!==1?'s':''}</span><button onClick={()=>setSelections([])}>Clear all</button></div>{selections.map(s=><div className="selection" key={s.event.id}><button className="remove" aria-label="Remove selection" onClick={()=>setSelections(v=>v.filter(x=>x.event.id!==s.event.id))}><X size={14}/></button><strong>{s.pick===0?s.event.home:s.pick===1?'Draw':s.event.away} <em>{s.event.odds[s.pick].toFixed(2)}</em></strong><small>Match result · {s.event.home} vs {s.event.away}</small></div>)}<label className="stake-label">{slipTab==='Single' && selections.length>1?'Stake per selection':'Stake amount'} <span>Demo only</span><input type="number" min="0" step="0.01" placeholder="0.00" value={stake} onChange={e=>setStake(e.target.value)} /></label><div className="slip-summary"><span>{slipTab==='Multiple'?'Combined odds':'Total stake'}</span><b>{slipTab==='Multiple'?totalOdds.toFixed(2):`$${(validStake ? value*selections.length : 0).toFixed(2)}`}</b></div><div className="slip-summary"><span>Potential return</span><b className="lime">${returns.toFixed(2)}</b></div><button className="place-button" onClick={()=>onUnavailable()}>Place bet</button><p className="slip-disclaimer">Demo calculations only. No bet will be placed.</p></div>}
    <div className="slip-footer"><ShieldCheck size={15}/> Play responsibly <span>·</span> 18+</div>
  </>;
}
