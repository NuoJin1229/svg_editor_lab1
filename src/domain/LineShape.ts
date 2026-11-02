import { NumericShape } from './NumericShape.js';

export class LineShape extends NumericShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, [{ name: 'x1', value: x1, axis: 'x' }, { name: 'y1', value: y1, axis: 'y' },
      { name: 'x2', value: x2, axis: 'x' }, { name: 'y2', value: y2, axis: 'y' }]);
  }
  override get tag(): string { return 'line'; }
  override clone(): LineShape { return this.copyStyles(new LineShape(this.id, this.value('x1'), this.value('y1'), this.value('x2'), this.value('y2'))); }
  protected override geometrySummary(): string { return `(${this.value('x1')},${this.value('y1')}) -> (${this.value('x2')},${this.value('y2')})`; }
}
