import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommandTokenizer } from '../src/cli/CommandTokenizer.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { EditorService } from '../src/application/EditorService.js';
import { FakeDocumentStore } from './FakeDocumentStore.js';
import { SvgParser } from '../src/infrastructure/SvgParser.js';

const tokenizer = new CommandTokenizer();

test('tokenizer preserves quote metadata, colors, empty text, Chinese and Windows paths', () => {
  const tokens = tokenizer.tokenize(String.raw`create text t 1 2 "开始 \"test\" C:\Users\me" in g`);
  assert.deepEqual(tokens.map(token => token.value), ['create', 'text', 't', '1', '2', '开始 "test" C:\\Users\\me', 'in', 'g']);
  assert.equal(tokens[5]?.quoted, true);
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize(''), []);
  assert.deepEqual(tokenizer.tokenize('set r fill #ffffff').map(token => token.value), ['set', 'r', 'fill', '#ffffff']);
  assert.equal(tokenizer.tokenize('set t text ""')[3]?.value, '');
  assert.throws(() => tokenizer.tokenize('create text t 0 0 "unfinished'), /unclosed double quote/);
  assert.throws(() => tokenizer.tokenize('"abc"def'), /whitespace/);
});

test('dispatcher supports all six create-in forms and quoted in content', async () => {
  const editor = new EditorService(new FakeDocumentStore());
  const dispatcher = new CommandDispatcher(editor);
  const run = (line: string) => dispatcher.execute(line);
  await assert.rejects(run('help'), /no document/);
  await run('init');
  await run('create g outer');
  await run('create g inner in outer');
  await run('create rect r 1 2 3 4 #fff in inner');
  await run('create circle c 1 2 3 in inner');
  await run('create ellipse e 1 2 3 4 in inner');
  await run('create line l 1 2 3 4 black in inner');
  await run('create text t 1 2 "in" in inner');
  assert.equal(editor.requireDocument().find('t').textContent, 'in');
  for (const id of ['r', 'c', 'e', 'l', 't']) assert.equal(editor.requireDocument().parent(id)?.id, 'inner');
  const help = await run('help');
  assert.equal(help?.split('\n').length, 19);
  const state = editor.session;
  await run('tree');
  await run('show t');
  await run('canvas');
  await run('# comment');
  assert.deepEqual(editor.session, state);
});

const invalidCommands: ReadonlyArray<readonly [string, RegExp]> = [
  ['move r 1', /usage: move/], ['move r 1 2 extra', /usage: move/],
  ['init 1 2 3', /usage: init/], ['canvas 10', /requires both/],
  ['create rect r 1 2 3 4', /id already exists: r/],
  ['create circle c 1x 2 3', /invalid number/],
  ['create text t 0 0 "unfinished', /unclosed double quote/],
  ['create text t 0 0 "a" extra', /invalid arguments/],
  ['create g h in missing', /no such container: missing/],
  ['create g h in r', /not a container: r/],
  ['delete missing', /no such shape: missing/],
  ['set r bad 1', /unknown attribute: bad/],
  ['scale r 0', /scale factor must be positive/],
  ['scale r NaN', /invalid number/],
  ['create box b 0 0 1 1 "title"', /unknown shape type: box \(is the plugin loaded\?\)/],
  ['unknown', /unknown command: unknown/],
];
for (const [line, error] of invalidCommands) {
  test(`failed input keeps model and history: ${line}`, async () => {
    const editor = new EditorService(new FakeDocumentStore());
    const dispatcher = new CommandDispatcher(editor);
    await dispatcher.execute('init');
    await dispatcher.execute('create rect r 1 2 3 4');
    await dispatcher.execute('move r 10 20');
    await dispatcher.execute('undo');
    const before = { tree: editor.tree(), session: editor.session };
    await assert.rejects(dispatcher.execute(line), error);
    assert.deepEqual({ tree: editor.tree(), session: editor.session }, before);
  });
}

function cli(script: string, cwd: string): string {
  const entry = fileURLToPath(new URL('../src/main.ts', import.meta.url));
  const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), entry], { cwd, input: script, encoding: 'utf8', timeout: 20_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /svg-editor 0\.1/);
  assert.match(result.stdout, /svg> /);
  return result.stdout;
}

for (const name of ['typical', 'flowchart', 'recovery']) {
  test(`real CLI process replays ${name} and validates its SVG artifact`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'svg-cli-'));
    try {
      await writeFile(join(directory, 'other.svg'), await readFile(new URL('./fixtures/other.svg', import.meta.url)));
      const script = await readFile(new URL(`../examples/${name}.commands`, import.meta.url), 'utf8');
      const output = cli(script, directory);
      const parser = new SvgParser();
      if (name === 'typical') {
        assert.match(output, /error: cannot group a container into its own descendant: markers/);
        assert.match(output, /rect#box restored into g#markers/);
        assert.match(output, /saved to demo.svg \(5 elements\)/);
        assert.match(output, /warning: assigned id rect1 to unnamed <rect>/);
        assert.match(output, /read other.svg \(7 elements\)/);
        assert.equal((output.match(/error:/g) ?? []).length, 2);
        const result = parser.parse(await readFile(join(directory, 'demo.svg'), 'utf8')).document;
        assert.equal(result.count, 5);
        assert.equal(result.find('title').textContent, 'My Diagram');
        assert.equal(result.find('c1').attributes().cx, '130');
      } else if (name === 'flowchart') {
        assert.doesNotMatch(output, /error:/);
        assert.match(output, /saved to flowchart.svg \(8 elements\)/);
        const result = parser.parse(await readFile(join(directory, 'flowchart.svg'), 'utf8')).document;
        assert.equal(result.count, 8);
        assert.equal(result.find('process').attributes().y, '100');
        assert.equal(result.find('process-label').textContent, '处理数据 v2');
        assert.deepEqual(result.find('flowchart').children.map(shape => shape.id), ['node1', 'node2', 'arrow1']);
      } else {
        assert.match(output, /error: unknown attribute: unknown/);
        assert.match(output, /error: undo not allowed after io command/);
        assert.match(output, /error: nothing to undo/);
        assert.match(output, /x="11"/);
        assert.equal(parser.parse(await readFile(join(directory, 'recovery.svg'), 'utf8')).document.find('r').attributes().x, '11');
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test('real CLI EOF, empty input and invalid command recover without a stack trace', async () => {
  const output = cli('help\ninit\ncreate text t 0 0 "in"\nunknown\nshow t\n', process.cwd());
  assert.match(output, /error: no document\. use 'init' or 'read' first/);
  assert.match(output, /error: unknown command: unknown/);
  assert.match(output, /text="in"/);
  assert.doesNotMatch(output, /at .*\.ts:/);
  assert.doesNotMatch(cli('', process.cwd()), /error:/);
});
