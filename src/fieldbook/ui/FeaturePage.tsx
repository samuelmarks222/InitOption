import { Dice5, Trophy, Gift, ShieldCheck, Wallet, ClipboardList, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '../core/routes';
import { featureContent } from '../core/features';

const icons = { casino: Dice5, jackpot: Trophy, promotion: Gift, wallet: Wallet, account: ClipboardList, virtual: Gamepad2, admin: ShieldCheck };
export function FeaturePage({section}: {section: string}) {
  const navigate = useNavigate();
  const feature = featureContent[section] ?? featureContent['My Bets'];
  const Icon = icons[feature.icon];
  return <div className="feature-page"><span className="eyebrow"><span/> FIELDBOOK · DEMO</span><h1>{feature.title}</h1><p className="feature-intro">{feature.description}</p><div className="feature-panel"><div className="feature-icon"><Icon size={28}/></div><h2>{feature.emptyTitle}</h2><p>{feature.emptyDescription}</p><button className="feature-button" onClick={()=>navigate(paths.Sports)}>Explore demo sports</button></div><div className="feature-note"><ShieldCheck size={16}/> No real-money products or account services are enabled in this demonstration.</div></div>;
}
