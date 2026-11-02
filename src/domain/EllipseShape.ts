import { NumericShape } from './NumericShape.js';

export class EllipseShape extends NumericShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, [{ name: 'cx', value: cx, axis: 'x' }, { name: 'cy', value: cy, axis: 'y' },
      { name: 'rx', value: rx, nonnegative: true }, { name: 'ry', value: ry, nonnegative: true }]);
  }
  override get tag(): string { return 'ellipse'; }
  override clone(): EllipseShape { return this.copyStyles(new EllipseShape(this.id, this.value('cx'), this.value('cy'), this.value('rx'), this.value('ry'))); }
  protected override geometrySummary(): string { return `cx=${this.value('cx')} cy=${this.value('cy')} rx=${this.value('rx')} ry=${this.value('ry')}`; }
}
