// Illustrative fixtures only; never use as a production feed.
export type Event = { id: string; league: string; sport: string; home: string; away: string; time: string; live?: boolean; score?: string; odds: [number, number, number]; colors: [string, string] };
export type Selection = { event: Event; pick: number };
export const demoEvents: Event[] = [
  { id:'1', league:'ENGLAND · PREMIER LEAGUE', sport:'Football', home:'Arsenal', away:'Manchester City', time:"72'", live:true, score:'2 : 1', odds:[2.15,3.40,3.25], colors:['#df3945','#85c8ee'] },
  { id:'2', league:'EUROPE · CHAMPIONS LEAGUE', sport:'Football', home:'Real Madrid', away:'Bayern Munich', time:"38'", live:true, score:'1 : 0', odds:[1.85,3.65,4.10], colors:['#f4f4ee','#d63643'] },
  { id:'3', league:'ENGLAND · PREMIER LEAGUE', sport:'Football', home:'Liverpool', away:'Chelsea', time:'Today, 20:00', odds:[1.92,3.55,3.85], colors:['#d83a48','#4167d7'] },
  { id:'4', league:'SPAIN · LA LIGA', sport:'Football', home:'Barcelona', away:'Atlético Madrid', time:'Today, 21:00', odds:[1.78,3.70,4.45], colors:['#a43c69','#e64b4b'] },
  { id:'5', league:'ITALY · SERIE A', sport:'Football', home:'Inter Milan', away:'AC Milan', time:'Tomorrow, 19:45', odds:[2.05,3.35,3.60], colors:['#4277b5','#c54348'] },
];
