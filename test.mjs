import * as lc from 'lightweight-charts';
console.log("EXPORTS:", Object.keys(lc));
import { createChart } from 'lightweight-charts';
// mock DOM for createChart to not throw immediately if possible, or just log
console.log("METHODS:", Object.keys(createChart));
