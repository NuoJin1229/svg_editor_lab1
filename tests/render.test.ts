import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Resvg } from '@resvg/resvg-js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgSerializer } from '../src/infrastructure/SvgSerializer.js';

test('rendered pixels verify front/back order, group paint inheritance and Composite movement', () => {
  const document = new SvgDocument(100, 100);
  const factory = new ShapeFactory();
  const serializer = new SvgSerializer();
  document.add(factory.create('g', 'g', []));
  document.find('g').setAttribute('fill', 'red');
  document.add(factory.create('rect', 'r', ['0', '0', '80', '80']), 'g');
  document.add(factory.create('circle', 'c', ['40', '40', '20', 'blue']), 'g');
  const pixel = (x: number, y: number): number[] => {
    const image = new Resvg(serializer.serialize(document), {
      font: { loadSystemFonts: false },
    }).render();
    const start = (y * image.width + x) * 4;
    return [...image.pixels.subarray(start, start + 4)];
  };
  assert.deepEqual(pixel(40, 40), [0, 0, 255, 255]);
  document.back('c');
  assert.deepEqual(pixel(40, 40), [255, 0, 0, 255]);
  document.front('c');
  assert.deepEqual(pixel(40, 40), [0, 0, 255, 255]);
  document.find('g').move(20, 20);
  assert.deepEqual(pixel(5, 5), [0, 0, 0, 0]);
  assert.deepEqual(pixel(25, 25), [255, 0, 0, 255]);
  assert.deepEqual(pixel(60, 60), [0, 0, 255, 255]);
});
