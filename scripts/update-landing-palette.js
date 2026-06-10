const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src', 'components', 'landing');

const walk = (dir) => {
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else if (/\.(tsx|ts|css)$/.test(ent.name)) out.push(full);
  }
  return out;
};

const replacements = [
  ['#0f1419', 'hsl(var(--landing-secondary))'],
  ['#141117', 'hsl(var(--landing-secondary))'],
  ['#16131a', 'hsl(var(--landing-secondary))'],
  ['#17131a', 'hsl(var(--landing-secondary))'],
  ['#18131a', 'hsl(var(--landing-secondary))'],
  ['#1a1820', 'hsl(var(--landing-secondary))'],
  ['#1b1820', 'hsl(var(--landing-secondary))'],
  ['#182838', 'hsl(var(--landing-secondary))'],
  ['#1a2538', 'hsl(var(--landing-secondary))'],
  ['#536471', 'hsl(var(--landing-border))'],
  ['#9aaec9', 'hsl(var(--landing-border))'],
  ['#6d5d52', 'hsl(var(--landing-border))'],
  ['#62564e', 'hsl(var(--landing-border))'],
  ['#60554c', 'hsl(var(--landing-border))'],
  ['#85766a', 'hsl(var(--landing-border))'],
  ['#4f463e', 'hsl(var(--landing-border))'],
  ['#7a6b62', 'hsl(var(--landing-border))'],
  ['#5d534c', 'hsl(var(--landing-border))'],
  ['#8a7b6f', 'hsl(var(--landing-border))'],
  ['#8c7b6f', 'hsl(var(--landing-border))'],
  ['#8c7d72', 'hsl(var(--landing-border))'],
  ['#8b7a6d', 'hsl(var(--landing-border))'],
  ['#8d7c71', 'hsl(var(--landing-border))'],
  ['#6e6259', 'hsl(var(--landing-border))'],
  ['#6f6259', 'hsl(var(--landing-border))'],
  ['#62574f', 'hsl(var(--landing-border))'],
  ['#6a5b50', 'hsl(var(--landing-border))'],
  ['#87776b', 'hsl(var(--landing-border))'],
  ['#c5d4ef', 'hsl(var(--landing-border))'],
  ['#b5c6e5', 'hsl(var(--landing-border))'],
  ['#25d366', 'hsl(var(--landing-primary))'],
  ['#1c78f8', 'hsl(var(--landing-primary))'],
  ['#6f4d00', 'hsl(var(--landing-primary))'],
  ['#4850c8', 'hsl(var(--landing-primary))'],
  ['#ff6a2b', 'hsl(var(--landing-primary))'],
  ['#ff7c36', 'hsl(var(--landing-primary))'],
  ['#ff8b63', 'hsl(var(--landing-primary))'],
  ['#ffd06c', 'hsl(var(--landing-primary))'],
  ['#ff9c63', 'hsl(var(--landing-primary))'],
  ['#ff9d6d', 'hsl(var(--landing-primary))'],
  ['#ffb16d', 'hsl(var(--landing-primary))'],
  ['#9be2b7', 'hsl(var(--landing-primary))'],
  ['#9ca8ff', 'hsl(var(--landing-primary))'],
  ['#eef0ff', '#ffffff'],
  ['#fff4d7', '#ffffff'],
  ['#cfd4ff', '#ffffff'],
  ['#fffaf4', '#ffffff'],
  ['#f1e8dc', '#ffffff'],
  ['#fff9f2', '#ffffff'],
  ['#fff5ec', '#ffffff'],
  ['#f4ebdf', '#ffffff'],
  ['#f6efe5', '#ffffff'],
  ['#f8f1e8', '#ffffff'],
  ['#fff1e7', '#ffffff'],
  ['#fff2e8', '#ffffff'],
  ['#f8fafc', 'hsl(var(--landing-surface))'],
  ['#f5f7fa', 'hsl(var(--landing-surface))'],
  ['#faf8f5', 'hsl(var(--landing-surface))'],
  ['#f0f2f5', 'hsl(var(--landing-surface))'],
  ['#cbd6e6', 'white'],
  ['#dbe9ff', 'white'],
  ['#e8ecf4', 'white'],
  ['#e8eaef', 'hsl(var(--landing-surface))'],
  ['#eaf8f1', 'hsl(var(--landing-surface))'],
  ['#efe5d9', 'white'],
  ['#f2e9de', 'white'],
  ['#fff8f1', 'white'],
  ['#eef1ff', 'white'],
  ['#fff8f1', 'white'],
  ['#fffaf4', '#ffffff'],
  ['#f0f2f5', 'hsl(var(--landing-surface))'],
  ['#f8f9fc', 'hsl(var(--landing-surface))'],
  ['#f0f2f5', 'hsl(var(--landing-surface))'],
  ['#f5f6fa', 'hsl(var(--landing-surface))'],
  ['#f8f9fc', 'hsl(var(--landing-surface))'],
  ['#e6f7f5', 'hsl(var(--landing-surface))'],
  ['#fffaf4', '#ffffff'],
  ['#f8fafc', 'hsl(var(--landing-surface))'],
  ['#e8ecf4', 'white'],
  ['#f5f6fa', 'hsl(var(--landing-surface))'],
  ['#f5f7fa', 'hsl(var(--landing-surface))'],
  ['#f0f2f5', 'hsl(var(--landing-surface))'],
  ['#faf8f5', 'hsl(var(--landing-surface))'],
  ['#f5f7fa', 'hsl(var(--landing-surface))'],
  ['#f8f1e8', 'white'],
  ['#f8f9fc', 'hsl(var(--landing-surface))'],
  ['#8c7d72', 'hsl(var(--landing-border))'],
  ['#17131a', 'hsl(var(--landing-secondary))'],
  ['#16131a', 'hsl(var(--landing-secondary))'],
  ['#141117', 'hsl(var(--landing-secondary))'],
  ['#182838', 'hsl(var(--landing-secondary))'],
  ['#1a1820', 'hsl(var(--landing-secondary))'],
  ['#1b1820', 'hsl(var(--landing-secondary))'],
  // additional common accents found in landing files
  ['#e85b4e', 'hsl(var(--landing-primary))'],
  ['#5671ff', 'hsl(var(--landing-primary))'],
  ['#7fdd95', 'hsl(var(--landing-primary))'],
  ['#7cf19d', 'hsl(var(--landing-primary))'],
  ['#ffb15c', 'hsl(var(--landing-primary))'],
  ['#fff4ea', 'white'],
  ['#fff4d7', 'white'],
  ['#fff5ec', 'white'],
  ['#fff1e7', 'white'],
  ['#f0e5d8', 'white'],
  ['#151117', 'hsl(var(--landing-secondary))'],
  ['#080b11', 'hsl(var(--landing-secondary))'],
  ['#0f1116', 'hsl(var(--landing-secondary))'],
  ['#0d0b10', 'hsl(var(--landing-secondary))'],
  // brown/neutral tones -> landing border
  ['#5f544c', 'hsl(var(--landing-border))'],
  ['#7d6d62', 'hsl(var(--landing-border))'],
  ['#8b7b70', 'hsl(var(--landing-border))'],
  ['#8a7b70', 'hsl(var(--landing-border))'],
  ['#89786d', 'hsl(var(--landing-border))'],
  ['#60554d', 'hsl(var(--landing-border))'],
  ['#6c5c52', 'hsl(var(--landing-border))'],
  ['#62564d', 'hsl(var(--landing-border))'],
  ['#6e625a', 'hsl(var(--landing-border))'],
  ['#61564e', 'hsl(var(--landing-border))'],
  ['#272128', 'hsl(var(--landing-border))'],
  ['#e5e7ef', 'white'],
  ['#5b5b5b', 'hsl(var(--landing-secondary))'],
  ['#fea', 'white'],
  ['#f3d792', 'white'],
  ['#f6ede2', 'white'],
  // final aggressive mappings
  ['#25D366', 'hsl(var(--landing-primary))'],
  ['#a9e2dd', 'hsl(var(--landing-border))'],
];

const rgbaReplacements = [
  ['rgba(0,0,0,0.06)', 'hsla(var(--landing-secondary),0.08)'],
  ['rgba(0,0,0,0.04)', 'hsla(var(--landing-secondary),0.06)'],
  ['rgba(0,0,0,0.08)', 'hsla(var(--landing-secondary),0.1)'],
  ['rgba(0,0,0,0.12)', 'hsla(var(--landing-secondary),0.14)'],
  ['rgba(0,0,0,0.15)', 'hsla(var(--landing-secondary),0.18)'],
  ['rgba(0,0,0,0.16)', 'hsla(var(--landing-secondary),0.18)'],
  ['rgba(0,0,0,0.18)', 'hsla(var(--landing-secondary),0.2)'],
  ['rgba(0,0,0,0.22)', 'hsla(var(--landing-secondary),0.24)'],
  ['rgba(0,0,0,0.24)', 'hsla(var(--landing-secondary),0.28)'],
  // additional black/dark shadow variants
  ['rgba(18,16,22,0.05)', 'hsla(var(--landing-secondary),0.06)'],
  ['rgba(18,16,22,0.06)', 'hsla(var(--landing-secondary),0.07)'],
  ['rgba(18,16,22,0.08)', 'hsla(var(--landing-secondary),0.1)'],
  ['rgba(18,16,22,0.16)', 'hsla(var(--landing-secondary),0.18)'],
  ['rgba(18,16,22,0.18)', 'hsla(var(--landing-secondary),0.2)'],
  ['rgba(18,16,22,0.24)', 'hsla(var(--landing-secondary),0.28)'],
  ['rgba(18,16,22,0.48)', 'hsla(var(--landing-secondary),0.48)'],
  ['rgba(255,106,43,0.22)', 'hsla(var(--landing-primary),0.22)'],
  ['rgba(76,109,255,0.16)', 'hsla(var(--landing-primary),0.16)'],
  ['rgba(76,109,255,0)', 'hsla(var(--landing-primary),0)'],
  ['rgba(255,124,54,0.28)', 'hsla(var(--landing-primary),0.28)'],
  ['rgba(255,124,54,0.18)', 'hsla(var(--landing-primary),0.18)'],
  ['rgba(255,124,54,0.24)', 'hsla(var(--landing-primary),0.24)'],
  ['rgba(255,124,54,0.16)', 'hsla(var(--landing-primary),0.16)'],
  ['rgba(255,124,54,0.05)', 'hsla(var(--landing-primary),0.05)'],
  ['rgba(255,126,58,0.12)', 'hsla(var(--landing-primary),0.12)'],
  ['rgba(255,106,43,0)', 'hsla(var(--landing-primary),0)'],
  ['rgba(18,22,31,0.98)', 'hsla(var(--landing-secondary),0.98)'],
  ['rgba(9,11,16,1)', 'hsl(var(--landing-secondary))'],
  ['rgba(17,14,20,0.36)', 'hsla(var(--landing-secondary),0.36)'],
  // white alpha variants -> landing surface
  ['rgba(255,255,255,0.76)', 'hsla(var(--landing-surface),0.76)'],
  ['rgba(255,255,255,0.62)', 'hsla(var(--landing-surface),0.62)'],
  ['rgba(255,255,255,0.3)', 'hsla(var(--landing-surface),0.3)'],
  ['rgba(255,255,255,0.2)', 'hsla(var(--landing-surface),0.2)'],
  ['rgba(255,255,255,0.16)', 'hsla(var(--landing-surface),0.16)'],
  ['rgba(255,255,255,0.12)', 'hsla(var(--landing-surface),0.12)'],
  ['rgba(255,255,255,0.08)', 'hsla(var(--landing-surface),0.08)'],
  ['rgba(255,255,255,0.04)', 'hsla(var(--landing-surface),0.04)'],
  // variants with spaces
  ['rgba(255, 255, 255, 0.06)', 'hsla(var(--landing-surface),0.06)'],
  ['rgba(255, 255, 255, 0.12)', 'hsla(var(--landing-surface),0.12)'],
  ['rgba(255, 255, 255, 0.02)', 'hsla(var(--landing-surface),0.02)'],
  ['rgba(255, 255, 255, 0.03)', 'hsla(var(--landing-surface),0.03)'],
  ['rgba(255, 255, 255, 0.64)', 'hsla(var(--landing-surface),0.64)'],
  // orange/alert accents -> landing primary
  ['rgba(255,106,43,0.35)', 'hsla(var(--landing-primary),0.35)'],
  ['rgba(255,112,40,0.1)', 'hsla(var(--landing-primary),0.1)'],
  ['rgba(255,106,43,0.1)', 'hsla(var(--landing-primary),0.1)'],
  ['rgba(255,106,43,0.15)', 'hsla(var(--landing-primary),0.15)'],
  // blue accents -> landing primary
  ['rgba(92,120,255,0.12)', 'hsla(var(--landing-primary),0.12)'],
  ['rgba(76,109,255,0.08)', 'hsla(var(--landing-primary),0.08)'],
  ['rgba(102,126,234,0.04)', 'hsla(var(--landing-primary),0.04)'],
  // dark background gradients -> secondary
  ['rgba(14,26,40,0.22)', 'hsla(var(--landing-secondary),0.22)'],
  ['rgba(14,26,40,0)', 'hsla(var(--landing-secondary),0)'],
  ['rgba(25,45,70,0.96)', 'hsla(var(--landing-secondary),0.96)'],
  ['rgba(14,26,40,0.98)', 'hsla(var(--landing-secondary),0.98)'],
  // a few additional dark/opacity variants
  ['rgba(0,0,0,0.25)', 'hsla(var(--landing-secondary),0.25)'],
  ['rgba(0,0,0,0.03)', 'hsla(var(--landing-secondary),0.03)'],
  ['rgba(0,0,0,0.48)', 'hsla(var(--landing-secondary),0.48)'],
  // final aggressive rgba mappings
  ['rgba(245,158,11,0.04)', 'hsla(var(--landing-primary),0.04)'],
  ['rgba(0,0,0,0)', 'transparent'],
  ['rgba(255,255,255,0)', 'transparent'],
  ['rgba(0,0,0,0.02)', 'hsla(var(--landing-secondary),0.02)'],
  ['rgba(20,17,23,0.18)', 'hsla(var(--landing-secondary),0.18)'],
  ['rgba(35,58,89,0.36)', 'hsla(var(--landing-secondary),0.36)'],
  ['rgba(55,163,114,0.12)', 'hsla(var(--landing-primary),0.12)'],
  ['rgba(0,163,108,0.08)', 'hsla(var(--landing-primary),0.08)'],
  ['rgba(255,255,255,0.64)', 'hsla(var(--landing-surface),0.64)'],
  ['rgba(255,255,255,0.06)', 'hsla(var(--landing-surface),0.06)'],
];

const files = walk(root);
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;

  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }
  for (const [from, to] of rgbaReplacements) {
    updated = updated.split(from).join(to);
  }

  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('patched', path.relative(process.cwd(), file));
  }
}
