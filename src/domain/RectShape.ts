import { NumericShape } from './NumericShape.js';

export class RectShape extends NumericShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, [
      { name: 'x', value: x, axis: 'x' },
      { name: 'y', value: y, axis: 'y' },
      { name: 'width', value: width, nonnegative: true },
      { name: 'height', value: height, nonnegative: true },
    ]);
  }
  override get tag(): string {
    return 'rect';
  }
  override clone(): RectShape {
    return this.copyStyles(
      new RectShape(
        this.id,
        this.value('x'),
        this.value('y'),
        this.value('width'),
        this.value('height'),
      ),
    );
  }
  protected override geometrySummary(): string {
    return `x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}`;
  }
}
