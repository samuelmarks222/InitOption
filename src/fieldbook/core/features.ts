import { casinoFeatures } from '../casino/features';
import { jackpotFeatures } from '../jackpots/features';
import { walletFeatures } from '../wallet/features';
import { administrationFeatures } from '../administration/features';
import { accountFeatures } from '../accounts/features';
export type Feature = {title:string; description:string; emptyTitle:string; emptyDescription:string; icon:'casino'|'jackpot'|'promotion'|'wallet'|'account'|'virtual'|'admin'};
export const featureContent: Record<string, Feature> = {
  ...casinoFeatures, ...jackpotFeatures, ...walletFeatures, ...administrationFeatures, ...accountFeatures,
  'Not Found': {title:'Page not found',description:'The page you requested does not exist.',emptyTitle:'Let’s get you back',emptyDescription:'Explore the demonstration sports homepage.',icon:'account'},
  Promotions: {title:'Promotions',description:'Find offers and their terms in one place.',emptyTitle:'No promotions available',emptyDescription:'There are no active offers in this demonstration.',icon:'promotion'},
};
