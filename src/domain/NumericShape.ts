import { Shape } from './Shape.js';
import { Value } from './Value.js';

export interface GeometryField {
  readonly name: string;
  readonly value: number;
  readonly axis?: 'x' | 'y';
  readonly nonnegative?: boolean;
}

export abstract class NumericShape extends Shape {
  readonly #fields: readonly GeometryField[];
  #geometry: Map<string, number>;

  protected constructor(id: string, fields: readonly GeometryField[]) {
    super(id);
    this.#fields = fields.map(field => ({ ...field }));
    this.#geometry = new Map(fields.map(field => [field.name, this.validate(field, field.value)]));
  }

  protected value(name: string): number {
    const result = this.#geometry.get(name);
    if (result === undefined) throw new Error(`unknown geometry: ${name}`);
    return result;
  }

  override attributes(): Readonly<Record<string, string>> {
    return { ...super.attributes(), ...Object.fromEntries([...this.#geometry].map(([key, value]) => [key, String(value)])) };
  }

  override setAttribute(name: string, value: string): void {
    const field = this.#fields.find(item => item.name === name);
    if (field) this.#geometry.set(name, this.validate(field, value));
    else super.setAttribute(name, value);
  }

  protected override moveGeometry(dx: number, dy: number): void {
    this.#geometry = new Map(this.#fields.map(field => {
      const delta = field.axis === 'x' ? dx : field.axis === 'y' ? dy : 0;
      return [field.name, this.validate(field, this.value(field.name) + delta)];
    }));
  }

  protected override scaleGeometry(factor: number): void {
    this.#geometry = new Map(this.#fields.map(field => [field.name, this.validate(field, this.value(field.name) * factor)]));
  }

  private validate(field: GeometryField, value: number | string): number {
    return field.nonnegative ? Value.nonnegative(value, field.name) : Value.number(value, field.name);
  }
}
