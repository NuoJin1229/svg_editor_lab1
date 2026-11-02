import { NumericShape } from './NumericShape.js';
import { Value } from './Value.js';

export class TextShape extends NumericShape {
  #content: string;
  constructor(id: string, x: number, y: number, content: string) {
    super(id, [{ name: 'x', value: x, axis: 'x' }, { name: 'y', value: y, axis: 'y' }]);
    this.#content = Value.text(content);
  }
  override get tag(): string { return 'text'; }
  override get textContent(): string { return this.#content; }
  override clone(): TextShape { return this.copyStyles(new TextShape(this.id, this.value('x'), this.value('y'), this.#content)); }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.#content = Value.text(value);
    else super.setAttribute(name, value);
  }
  protected override geometrySummary(): string { return `(${this.value('x')},${this.value('y')}) ${JSON.stringify(this.#content)}`; }
}
