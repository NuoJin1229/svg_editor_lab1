import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorService } from '../src/application/EditorService.js';
import { FakeDocumentStore } from './FakeDocumentStore.js';

function editor(): EditorService {
  const service = new EditorService(new FakeDocumentStore());
  service.init();
  service.create('g', 'outer', []);
  service.create('g', 'inner', [], 'outer');
  service.create('rect', 'r', ['1', '2', '3', '4'], 'inner');
  service.create('text', 't', ['5', '6', '你好'], 'inner');
  service.create('circle', 'c', ['20', '30', '4'], 'outer');
  return service;
}

const edits: ReadonlyArray<readonly [string, (service: EditorService) => void]> = [
  ['create', s => { s.create('ellipse', 'e', ['1', '2', '3', '4'], 'inner'); }],
  ['delete', s => { s.delete('inner'); }],
  ['move', s => { s.move('outer', '10', '20'); }],
  ['scale', s => { s.scale('outer', '2'); }],
  ['set', s => { s.set('t', 'text', '新的文本 & <内容>'); }],
  ['group', s => { s.group('cluster', ['c', 't']); }],
  ['ungroup', s => { s.ungroup('inner'); }],
  ['addto', s => { s.addto('inner', 'c'); }],
  ['front', s => { s.front('r'); }],
  ['back', s => { s.back('t'); }],
];

for (const [name, edit] of edits) {
  test(`${name}: one Command precisely undoes and redoes the complete model`, () => {
    const s = editor();
    const before = s.tree();
    const previous = s.session.undo;
    edit(s);
    const after = s.tree();
    assert.notEqual(after, before);
    assert.equal(s.session.undo, previous + 1);
    s.undo();
    assert.equal(s.tree(), before);
    s.redo();
    assert.equal(s.tree(), after);
    s.requireDocument().validate();
  });
}

test('failed edits preserve redo; readonly queries preserve the entire session', () => {
  const s = editor();
  s.move('r', '10', '0');
  s.undo();
  const before = { tree: s.tree(), session: s.session };
  assert.throws(() => s.set('r', 'cx', '3'), /unknown attribute: cx/);
  assert.throws(() => s.group('bad', ['r', 'inner']), /descendant/);
  s.tree('inner');
  s.show('r');
  s.canvas();
  assert.deepEqual({ tree: s.tree(), session: s.session }, before);
  s.redo();
  assert.match(s.show('r'), /x="11"/);
  s.undo();
  s.set('r', 'fill', 'red');
  assert.throws(() => s.redo(), /nothing to redo/);
});

test('partway Composite numeric overflow restores previously changed siblings', () => {
  const s = editor();
  s.create('rect', 'huge', ['1e308', '0', '1', '1'], 'outer');
  const before = { tree: s.tree(), session: s.session };
  assert.throws(() => s.scale('outer', '10'), /invalid number/);
  assert.deepEqual({ tree: s.tree(), session: s.session }, before);
});

test('all document barriers, failed I/O and default paths obey the state machine', async () => {
  const store = new FakeDocumentStore();
  const s = new EditorService(store);
  assert.throws(() => s.tree(), /no document/);
  s.init();
  assert.throws(() => s.undo(), /undo not allowed after io command/);
  await assert.rejects(s.save(), /no file path/);
  s.create('rect', 'r', ['1', '2', '3', '4']);
  await s.save('a.svg');
  assert.deepEqual(s.session, { path: 'a.svg', undo: 0, redo: 0, blocked: true });
  assert.throws(() => s.create('box', 'b', []), /unknown shape type/);
  assert.throws(() => s.redo(), /undo not allowed after io command/);
  s.move('r', '10', '0');
  s.undo();
  assert.throws(() => s.undo(), /nothing to undo/);
  const before = { tree: s.tree(), session: s.session };
  store.fail = true;
  await assert.rejects(s.save('b.svg'), /cannot write file/);
  await assert.rejects(s.read('missing.svg'), /cannot read file/);
  assert.deepEqual({ tree: s.tree(), session: s.session }, before);
  store.fail = false;
  s.redo();
  await s.save('b.svg');
  assert.equal(s.session.path, 'a.svg');
  await s.save();
  assert.equal(store.files.get('a.svg')?.find('r').attributes().x, '11');
  await s.read('a.svg');
  assert.throws(() => s.undo(), /undo not allowed after io command/);
  s.canvas('200', '300');
  assert.throws(() => s.redo(), /undo not allowed after io command/);
  s.create('g', 'g', []);
  const state = s.session;
  assert.throws(() => s.canvas('400', '-1'), /height must be positive/);
  assert.deepEqual(s.session, state);
  assert.equal(s.canvas(), 'canvas 200x300');
  s.init('400');
  assert.equal(s.canvas(), 'canvas 400x600');
  assert.equal(s.session.path, undefined);
  assert.throws(() => s.undo(), /undo not allowed after io command/);
});

test('zero-change success consumes one history unit; invalid input preserves it', () => {
  const s = editor();
  const before = s.session.undo;
  s.move('r', '0', '0');
  assert.equal(s.session.undo, before + 1);
  s.undo();
  const state = s.session;
  assert.throws(() => s.move('r', '1x', '2'), /invalid number/);
  assert.throws(() => s.scale('r', '-1'), /scale factor must be positive/);
  assert.deepEqual(s.session, state);
});
