import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgParser } from '../src/infrastructure/SvgParser.js';
import { SvgSerializer } from '../src/infrastructure/SvgSerializer.js';
import { FileDocumentStore } from '../src/infrastructure/FileDocumentStore.js';
import { EditorService } from '../src/application/EditorService.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

const parser = new SvgParser();
const serializer = new SvgSerializer();
const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">${body}</svg>`;

test('course other.svg imports 7 shapes in order with one exact warning', async () => {
  const result = parser.parse(await readFile(new URL('./fixtures/other.svg', import.meta.url), 'utf8'));
  assert.equal(result.document.count, 7);
  assert.deepEqual(result.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.deepEqual(result.document.shapes.map(shape => shape.id), ['rect1', 't1', 'c1', 'g1', 'r2', 'c2', 'e1']);
  assert.equal(result.document.parent('r2')?.id, 'g1');
});

test('two-pass ID allocation reserves later IDs and includes empty IDs and groups', () => {
  const result = parser.parse(wrap('<rect/><g id=""><circle/></g><rect id="rect1"/><rect/>'));
  assert.deepEqual(result.document.shapes.map(shape => shape.id), ['rect2', 'g1', 'circle1', 'rect1', 'rect3']);
  assert.equal(result.warnings.length, 4);
});

test('all shapes, interleaved order, inherited styles and XML text survive round-trip', () => {
  const doc = new SvgDocument(400, 300);
  const factory = new ShapeFactory();
  const group = factory.create('g', 'group', []);
  group.setAttribute('fill', '#fff');
  doc.add(group);
  const entries = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['2', '3', '4']],
    ['rect', ['-1.5', '.5', '3', '4']], ['ellipse', ['1', '2', '3', '4']],
    ['line', ['1', '2', '3', '4']], ['text', ['1', '2', '中文 <tag> & "quote"\r\n\t内容']],
  ] as const;
  entries.forEach(([type, args], index) => doc.add(factory.create(type, `id${index}`, args), 'group'));
  const encoded = serializer.serialize(doc);
  assert.match(encoded, /&lt;tag&gt; &amp;/);
  const decoded = parser.parse(encoded);
  assert.deepEqual(decoded.warnings, []);
  assert.equal(serializer.serialize(decoded.document), encoded);
  assert.equal(decoded.document.find('id5').textContent, doc.find('id5').textContent);
  assert.equal(decoded.document.find('id0').attributes().fill, undefined);
});

test('prefixed SVG namespace, CDATA, px dimensions, defaults and box degradation', () => {
  const result = parser.parse('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="400px" height="300px"><s:g id="b" data-kind="box"><s:text id="t"><![CDATA[<开始>&]]></s:text></s:g></s:svg>');
  assert.equal(result.document.find('b').tag, 'g');
  assert.equal(result.document.find('t').textContent, '<开始>&');
  assert.equal(result.document.find('t').attributes().x, '0');
  assert.equal(parser.parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30"/>').document.width, 20);
});

const invalid = [
  ['duplicate IDs', '<rect id="a"/><g id="a"/>'],
  ['negative geometry', '<rect id="a" width="-1"/>'],
  ['invalid numeric suffix', '<rect id="a" x="1bad"/>'],
  ['nonfinite geometry', '<circle id="a" r="Infinity"/>'],
  ['unsupported transform', '<g id="a" transform="translate(2 3)"/>'],
  ['unsupported font', '<text id="a" font-size="20">hello</text>'],
  ['unsupported element', '<path id="a" d="M0 0L1 1"/>'],
  ['unsupported CSS', '<rect id="a" style="fill:red"/>'],
  ['text as attribute', '<text id="a" text="hello"/>'],
  ['mixed nested text', '<text id="a">hello<g id="g"/></text>'],
  ['unresolved entity', '<text id="a">&unknown;</text>'],
  ['unclosed XML', '<g id="a">'],
  ['foreign namespace', '<g xmlns="urn:other" id="a"/>'],
];
for (const [name, body] of invalid) test(`reject ${name}`, () => assert.throws(() => parser.parse(wrap(body!))));

test('reject invalid root, root attributes, viewBox and DOCTYPE', () => {
  for (const source of [
    '<svg/>', '<g xmlns="http://www.w3.org/2000/svg"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" style="fill:red"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="10%"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 2 3 4"/>',
    '<!DOCTYPE svg [<!ENTITY e SYSTEM "file:///secret">]>' + wrap('<text id="a">&e;</text>'),
  ]) assert.throws(() => parser.parse(source), source);
});

test('real file save replaces existing contents atomically; failure preserves session and leaves no temp file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-store-'));
  try {
    const s = new EditorService(new FileDocumentStore());
    s.init();
    s.create('rect', 'r', ['1', '2', '3', '4']);
    const path = join(directory, '图形 file.svg');
    await writeFile(path, 'old contents');
    await s.save(path);
    s.move('r', '5', '0');
    await s.save();
    assert.equal(parser.parse(await readFile(path, 'utf8')).document.find('r').attributes().x, '6');
    s.move('r', '5', '0');
    s.undo();
    const before = { tree: s.tree(), session: s.session };
    await mkdir(join(directory, 'directory.svg'));
    await assert.rejects(s.save(join(directory, 'directory.svg')), /cannot write file/);
    await assert.rejects(s.save(join(directory, 'missing', 'bad.svg')), /cannot write file/);
    await assert.rejects(s.read(join(directory, 'missing.svg')), /cannot read file/);
    const malformed = join(directory, 'bad.svg');
    await writeFile(malformed, wrap('<rect/><rect id="a"/><g id="a"/>'));
    await assert.rejects(s.read(malformed), /id already exists: a/);
    assert.deepEqual({ tree: s.tree(), session: s.session }, before);
    s.redo();
    assert.equal(s.requireDocument().find('r').attributes().x, '11');
    assert.equal((await readdir(directory)).some(name => name.endsWith('.tmp')), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
