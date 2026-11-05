import type { Feature } from '../core/features';
export const casinoFeatures: Record<string, Feature> = {
  Casino: {title:'Casino',description:'Discover the casino collection.',emptyTitle:'No games available yet',emptyDescription:'Licensed provider integration is required before games can be displayed or launched.',icon:'casino'},
  'Live Casino': {title:'Live Casino',description:'A place for live dealer games.',emptyTitle:'No live games available',emptyDescription:'Live dealer games require a licensed provider connection.',icon:'casino'},
  'Virtual Sports': {title:'Virtual Sports',description:'Virtual events, clearly separate from real sports.',emptyTitle:'No virtual events available',emptyDescription:'A licensed virtual sports provider is not connected.',icon:'virtual'},
};
