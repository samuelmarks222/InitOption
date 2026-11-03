import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const result = await build({entryPoints:['financial-chart/frontend.js'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true});
const template = await readFile('financial-chart/interface.html','utf8');
await writeFile('financial-chart/chart.html',template.replace('/* CHART_BUNDLE */',result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')));
console.log('Standalone HTML written to financial-chart/chart.html (no external frontend dependencies).');
