import { Shape } from './Shape.js';
import { RectShape } from './RectShape.js';
import { CircleShape } from './CircleShape.js';
import { EllipseShape } from './EllipseShape.js';
import { LineShape } from './LineShape.js';
import { TextShape } from './TextShape.js';
import { GroupShape } from './GroupShape.js';
import { Value } from './Value.js';

interface ShapeDefinition {
  readonly parameters: readonly string[];
  readonly paint?: string;
  readonly make: (id: string, values: Readonly<Record<string, string>>) => Shape;
}

export class ShapeFactory {
  // The only shape-name dispatch site. Future phase: replace built-ins with providers.
  readonly #definitions = new Map<string, ShapeDefinition>([
    ['rect', { parameters: ['x', 'y', 'width', 'height'], paint: 'fill', make: (id, v) => new RectShape(id, this.numeric(v, 'x'), this.numeric(v, 'y'), this.numeric(v, 'width'), this.numeric(v, 'height')) }],
    ['circle', { parameters: ['cx', 'cy', 'r'], paint: 'fill', make: (id, v) => new CircleShape(id, this.numeric(v, 'cx'), this.numeric(v, 'cy'), this.numeric(v, 'r')) }],
    ['ellipse', { parameters: ['cx', 'cy', 'rx', 'ry'], paint: 'fill', make: (id, v) => new EllipseShape(id, this.numeric(v, 'cx'), this.numeric(v, 'cy'), this.numeric(v, 'rx'), this.numeric(v, 'ry')) }],
    ['line', { parameters: ['x1', 'y1', 'x2', 'y2'], paint: 'stroke', make: (id, v) => new LineShape(id, this.numeric(v, 'x1'), this.numeric(v, 'y1'), this.numeric(v, 'x2'), this.numeric(v, 'y2')) }],
    ['text', { parameters: ['x', 'y', 'text'], make: (id, v) => new TextShape(id, this.numeric(v, 'x'), this.numeric(v, 'y'), v.text ?? '') }],
    ['g', { parameters: [], make: id => new GroupShape(id) }],
  ]);

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    const expected = definition.parameters.length;
    if (parameters.length < expected || parameters.length > expected + (definition.paint ? 1 : 0)) {
      throw new Error(`invalid arguments for create ${type}`);
    }
    const values = Object.fromEntries(definition.parameters.map((name, index) => [name, parameters[index]!]));
    const shape = definition.make(id, values);
    if (definition.paint && parameters.length > expected) shape.setAttribute(definition.paint, parameters[expected]!);
    return shape;
  }

  fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, text?: string): Shape {
    const definition = this.definition(type);
    const values: Record<string, string> = {};
    for (const name of definition.parameters) values[name] = name === 'text' ? text ?? '' : (attributes[name] ?? '0').replace(/px$/, '');
    const shape = definition.make(id, values);
    if (text !== undefined && shape.textContent === undefined && text.trim()) throw new Error(`unexpected text in <${type}>`);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'id' || definition.parameters.includes(name) && name !== 'text') continue;
      if (name === 'data-kind' && shape.container) continue;
      if (name === 'text') throw new Error('text content must be an XML text node');
      shape.setAttribute(name, name === 'stroke-width' ? value.replace(/px$/, '') : value);
    }
    return shape;
  }

  private definition(type: string): ShapeDefinition {
    const result = this.#definitions.get(type);
    if (!result) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return result;
  }

  private numeric(values: Readonly<Record<string, string>>, name: string): number {
    return Value.number(values[name] ?? '0', name);
  }
}
