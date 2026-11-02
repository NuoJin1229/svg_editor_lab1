import { Value } from './Value.js';
import type { GroupShape } from './GroupShape.js';

export abstract class Shape {
  readonly #id: string;
  readonly #styles = new Map<string, string>();

  protected constructor(id: string) {
    this.#id = Value.id(id);
  }

  get id(): string {
    return this.#id;
  }
  abstract get tag(): string;
  get label(): string {
    return `${this.tag}#${this.id}`;
  }
  get children(): readonly Shape[] {
    return [];
  }
  get textContent(): string | undefined {
    return undefined;
  }
  get container(): GroupShape | undefined {
    return undefined;
  }

  abstract clone(): Shape;
  protected abstract moveGeometry(dx: number, dy: number): void;
  protected abstract scaleGeometry(factor: number): void;
  protected abstract geometrySummary(): string;

  move(dx: number, dy: number): void {
    this.moveGeometry(Value.number(dx, 'dx'), Value.number(dy, 'dy'));
  }

  scale(factor: number): void {
    this.scaleGeometry(Value.positive(factor, 'scale factor'));
  }

  setAttribute(name: string, value: string): void {
    if (name === 'stroke-width') {
      this.#styles.set(name, String(Value.nonnegative(value, name)));
      return;
    }
    if (name === 'fill' || name === 'stroke') {
      Value.text(value);
      if (!value.trim() || /[\r\n]/.test(value) || /url\s*\(/i.test(value)) {
        throw new Error(`unsupported paint: ${value}`);
      }
      this.#styles.set(name, value);
      return;
    }
    throw new Error(`unknown attribute: ${name}`);
  }

  attributes(): Readonly<Record<string, string>> {
    return { id: this.id, ...Object.fromEntries(this.#styles) };
  }

  summary(): string {
    const styles = [...this.#styles].map(
      ([key, value]) => `${key}=${JSON.stringify(value).slice(1, -1)}`,
    );
    return [this.label, this.geometrySummary(), ...styles].filter(Boolean).join('  ');
  }

  protected copyStyles<T extends Shape>(target: T): T {
    for (const [name, value] of this.#styles) target.setAttribute(name, value);
    return target;
  }
}
