import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const examples = join(root, 'examples');
const evidence = join(root, 'doc', 'evidence');
await mkdir(evidence, { recursive: true });
await copyFile(join(root, 'tests', 'fixtures', 'other.svg'), join(examples, 'other.svg'));
const cases = [
  ['typical', 2],
  ['flowchart', 0],
  ['recovery', 4],
  ['moved', 0],
] as const;
for (const [name, errors] of cases) {
  const input = await readFile(join(examples, `${name}.commands`), 'utf8');
  const result = spawnSync(
    process.execPath,
    ['--import', import.meta.resolve('tsx'), resolve(root, 'src', 'main.ts')],
    {
      cwd: examples,
      input,
      encoding: 'utf8',
      timeout: 20_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || result.stderr) throw new Error(result.stderr || 'CLI failed');
  if ((result.stdout.match(/error:/g) ?? []).length !== errors)
    throw new Error(`unexpected error count in ${name}`);
  await writeFile(join(evidence, `${name}.txt`), result.stdout, 'utf8');
  console.log(`${name}: real CLI replay completed, ${errors} expected errors`);
}
