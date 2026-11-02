import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { DocumentSnapshot } from '../src/domain/DocumentSnapshot.js';

const factory = new ShapeFactory();
const geometries = [
  { type: 'rect', args: ['1', '2', '3', '4'], expected: { x: '22', y: '44', width: '6', height: '8' } },
  { type: 'circle', args: ['1', '2', '3'], expected: { cx: '22', cy: '44', r: '6' } },
  { type: 'ellipse', args: ['1', '2', '3', '4'], expected: { cx: '22', cy: '44', rx: '6', ry: '8' } },
  { type: 'line', args: ['1', '2', '3', '4'], expected: { x1: '22', y1: '44', x2: '26', y2: '48' } },
  { type: 'text', args: ['1', '2', '开始 & <结束>'], expected: { x: '22', y: '44' } },
];

for (const item of geometries) {
  test(`${item.type}: polymorphic geometry, styles and independent clone`, () => {
    const shape = factory.create(item.type, 'a', item.args);
    assert.equal(shape.attributes().fill, undefined);
    shape.move(10, 20);
    shape.scale(2);
    for (const [name, value] of Object.entries(item.expected)) assert.equal(shape.attributes()[name], value);
    shape.setAttribute('stroke-width', '2.5');
    const clone = shape.clone();
    clone.setAttribute('fill', 'red');
    assert.equal(shape.attributes().fill, undefined);
    assert.equal(clone.attributes()['stroke-width'], '2.5');
    assert.throws(() => shape.setAttribute('id', 'b'), /unknown attribute: id/);
    assert.throws(() => shape.scale(0), /scale factor must be positive/);
    assert.throws(() => shape.scale(Infinity), /invalid number/);
  });
}

test('nested Composite applies each transform once and retains inherited style declarations', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'outer', []));
  doc.add(factory.create('g', 'inner', []), 'outer');
  doc.add(factory.create('rect', 'r', ['1', '2', '3', '4']), 'inner');
  doc.find('outer').setAttribute('fill', 'blue');
  doc.find('outer').move(10, 20);
  doc.find('outer').scale(2);
  assert.deepEqual(doc.find('r').attributes(), { id: 'r', x: '22', y: '44', width: '6', height: '8' });
  assert.equal(doc.find('outer').attributes().fill, 'blue');
  assert.throws(() => doc.find('outer').setAttribute('x', '1'), /unknown attribute/);
});

test('tree operations preserve document order, parents and global IDs', () => {
  const doc = new SvgDocument();
  for (const id of ['a', 'b', 'c', 'd']) doc.add(factory.create('rect', id, ['0', '0', '10', '10']));
  doc.group('g1', ['c', 'a']);
  assert.deepEqual(doc.roots.map(s => s.id), ['g1', 'b', 'd']);
  assert.deepEqual(doc.find('g1').children.map(s => s.id), ['a', 'c']);
  doc.group('g2', ['d', 'c']);
  assert.deepEqual(doc.roots.map(s => s.id), ['g2', 'g1', 'b']);
  assert.deepEqual(doc.find('g2').children.map(s => s.id), ['c', 'd']);
  doc.addTo('g2', 'g1');
  doc.ungroup('g1');
  assert.deepEqual(doc.find('g2').children.map(s => s.id), ['c', 'd', 'a']);
  assert.equal(doc.parent('a')?.id, 'g2');
  doc.front('c');
  assert.deepEqual(doc.find('g2').children.map(s => s.id), ['d', 'a', 'c']);
  doc.back('c');
  assert.deepEqual(doc.find('g2').children.map(s => s.id), ['c', 'd', 'a']);
  doc.delete('g2');
  assert.deepEqual(doc.shapes.map(s => s.id), ['b']);
  doc.add(factory.create('g', 'a', []));
});

test('invalid tree edits fail before mutation; IDs are case-sensitive', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('g', 'h', []), 'g');
  doc.add(factory.create('g', 'G', []));
  assert.throws(() => doc.addTo('h', 'g'), /descendant/);
  assert.throws(() => doc.group('bad', ['h', 'g']), /cannot group a container into its own descendant: g/);
  assert.throws(() => doc.group('bad', ['h', 'h']), /duplicate group target/);
  assert.throws(() => doc.ungroup('g'), /cannot ungroup top-level container: g/);
  assert.throws(() => doc.add(factory.create('g', 'g', [])), /id already exists: g/);
  assert.throws(() => doc.add(factory.create('g', 'x', []), 'missing'), /no such container: missing/);
  assert.equal(doc.parent('h')?.id, 'g');
  assert.equal(doc.count, 3);
});

test('snapshot deeply restores geometry, styles, text, tree and index', () => {
  const doc = new SvgDocument();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('text', 't', ['1', '2', '你好']), 'g');
  const snapshot = new DocumentSnapshot(doc);
  doc.find('t').setAttribute('text', 'changed');
  doc.delete('g');
  doc.resize(20, 30);
  snapshot.restoreInto(doc);
  assert.equal(doc.find('t').textContent, '你好');
  assert.equal(doc.parent('t')?.id, 'g');
  assert.equal(doc.width, 800);
  doc.find('t').move(10, 10);
  snapshot.restoreInto(doc);
  assert.equal(doc.find('t').attributes().x, '1');
});

test('numeric validation, overflow, unknown types and attributes', () => {
  for (const value of ['NaN', 'Infinity', '2px', '', '1x']) assert.throws(() => factory.create('circle', 'c', [value, '0', '2']), /invalid number/);
  assert.throws(() => factory.create('rect', 'r', ['0', '0', '-1', '2']), /non-negative/);
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type: box/);
  const shape = factory.create('rect', 'r', ['1e308', '0', '2', '3']);
  const before = shape.attributes();
  assert.throws(() => shape.scale(10), /invalid number/);
  assert.deepEqual(shape.attributes(), before);
  assert.throws(() => factory.create('text', 't', ['0', '0', '\u0001']), /invalid XML character/);
});
