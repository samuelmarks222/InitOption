/** Stateless selection control shared by event views; never submits a bet. */
export function OddsButton({label, odds, selected, onClick}: {label:string; odds:number; selected:boolean; onClick:()=>void}) {
  return <button className={selected?'chosen':''} onClick={onClick} aria-label={label} aria-pressed={selected}>{odds.toFixed(2)}</button>;
}
