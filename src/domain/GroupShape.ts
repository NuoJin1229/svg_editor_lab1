import { Shape } from './Shape.js';

export class GroupShape extends Shape {
  readonly #children: Shape[] = [];
  constructor(id: string) { super(id); }
  override get tag(): string { return 'g'; }
  override get container(): GroupShape { return this; }
  override get children(): readonly Shape[] { return [...this.#children]; }

  insert(index: number, shape: Shape): void {
    if (!Number.isInteger(index) || index < 0 || index > this.#children.length) throw new Error('invalid child position');
    if (shape === this || shape.container?.contains(this) || this.contains(shape)) throw new Error('cannot create a cycle or duplicate child');
    this.#children.splice(index, 0, shape);
  }

  remove(shape: Shape): void {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new Error('shape is not a direct child');
    this.#children.splice(index, 1);
  }

  contains(shape: Shape): boolean {
    return this.#children.some(child => child === shape || child.container?.contains(shape));
  }

  override clone(): GroupShape {
    const result = this.copyStyles(new GroupShape(this.id));
    for (const child of this.#children) result.insert(result.children.length, child.clone());
    return result;
  }
  protected override moveGeometry(dx: number, dy: number): void { for (const child of this.#children) child.move(dx, dy); }
  protected override scaleGeometry(factor: number): void { for (const child of this.#children) child.scale(factor); }
  protected override geometrySummary(): string { return ''; }
}
