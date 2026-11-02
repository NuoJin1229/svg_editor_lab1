import { NumericShape } from './NumericShape.js';

export class CircleShape extends NumericShape {
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, [
      { name: 'cx', value: cx, axis: 'x' },
      { name: 'cy', value: cy, axis: 'y' },
      { name: 'r', value: r, nonnegative: true },
    ]);
  }
  override get tag(): string {
    return 'circle';
  }
  override clone(): CircleShape {
    return this.copyStyles(
      new CircleShape(this.id, this.value('cx'), this.value('cy'), this.value('r')),
    );
  }
  protected override geometrySummary(): string {
    return `cx=${this.value('cx')} cy=${this.value('cy')} r=${this.value('r')}`;
  }
}
