import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(root, 'src');
const files: string[] = [];
const collect = async (directory: string): Promise<void> => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (path.endsWith('.ts')) files.push(path);
  }
};
await collect(sourceRoot);
const allowed: Readonly<Record<string, readonly string[]>> = {
  main: ['cli', 'application', 'infrastructure'],
  cli: ['cli', 'application'],
  application: ['application', 'domain'],
  infrastructure: ['infrastructure', 'domain', 'application'],
  domain: ['domain'],
};
const dependencies = new Set<string>();
let imports = 0;
let classes = 0;
for (const path of files) {
  const local = relative(sourceRoot, path);
  const layer = local === 'main.ts' ? 'main' : local.split(sep)[0]!;
  const source = await readFile(path, 'utf8');
  // This scan checks the static import syntax used by this repository.
  const declarations = [...source.matchAll(/^export\s+(?:abstract\s+)?class\s+(\w+)/gm)];
  classes += declarations.length;
  if (
    declarations.length > 1 ||
    (declarations.length === 1 && declarations[0]![1] !== basename(path, '.ts'))
  ) {
    throw new Error(`class/file naming mismatch: ${local}`);
  }
  if (/\brequire\s*\(|\bimport\s*\(/.test(source))
    throw new Error(`dynamic import requires manual review: ${local}`);
  for (const statement of source.matchAll(/^import\s+[\s\S]*?['"]([^'"]+)['"]\s*;/gm)) {
    imports++;
    const specifier = statement[1]!;
    if (!specifier.startsWith('.')) {
      if (layer === 'domain' || layer === 'application')
        throw new Error(`external dependency in ${local}: ${specifier}`);
      continue;
    }
    const target = relative(sourceRoot, resolve(dirname(path), specifier)).split(sep);
    const targetLayer = target[0]!;
    if (!allowed[layer]?.includes(targetLayer))
      throw new Error(`forbidden dependency: ${local} -> ${specifier}`);
    if (layer === 'infrastructure' && targetLayer === 'application' && target[1] !== 'ports')
      throw new Error(`infrastructure may only import application ports: ${local}`);
    if (layer !== targetLayer) dependencies.add(`${layer} -> ${targetLayer}`);
  }
}
console.log(
  `PASS: ${files.length} source files, ${classes} classes, ${imports} imports, no layer or class/file violations`,
);
console.log([...dependencies].sort().join('\n'));
