import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: npm run render -- <input.svg> <output.png>');
const renderer = new Resvg(await readFile(input), {
  background: 'white',
  font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft YaHei' },
});
const image = renderer.render();
await writeFile(output, image.asPng());
console.log(`rendered ${input} -> ${output} (${image.width}x${image.height})`);
