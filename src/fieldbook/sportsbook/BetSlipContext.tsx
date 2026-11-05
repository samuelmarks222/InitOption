import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Selection } from './demoEvents';

type SlipState = {
  selections: Selection[]; setSelections: Dispatch<SetStateAction<Selection[]>>;
  stake: string; setStake: Dispatch<SetStateAction<string>>;
  slipTab: 'Single' | 'Multiple'; setSlipTab: Dispatch<SetStateAction<'Single' | 'Multiple'>>;
};
const Context = createContext<SlipState | null>(null);
export function BetSlipProvider({children}: {children: ReactNode}) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState('');
  const [slipTab, setSlipTab] = useState<'Single'|'Multiple'>('Single');
  return <Context.Provider value={{selections,setSelections,stake,setStake,slipTab,setSlipTab}}>{children}</Context.Provider>;
}
export function useBetSlip() {
  const state = useContext(Context);
  if (!state) throw new Error('BetSlipProvider is required');
  return state;
}
