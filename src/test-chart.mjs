import { JSDOM } from 'jsdom';
import * as lc from 'lightweight-charts';

const dom = new JSDOM(`<!DOCTYPE html><div></div>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

try {
  const chart = lc.createChart(document.querySelector('div'));
  console.log("CHART METHODS:", Object.keys(chart));
  console.log("PROTOTYPE:", Object.getOwnPropertyNames(Object.getPrototypeOf(chart)));
} catch (e) {
  console.error(e);
}
