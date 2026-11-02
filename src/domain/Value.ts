export class Value {
  static number(value: string | number, name: string): number {
    if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid number: ${name}`);
    }
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`invalid number: ${name}`);
    return Object.is(result, -0) ? 0 : result;
  }

  static nonnegative(value: string | number, name: string): number {
    const result = Value.number(value, name);
    if (result < 0) throw new Error(`${name} must be non-negative`);
    return result;
  }

  static positive(value: string | number, name: string): number {
    const result = Value.number(value, name);
    if (result <= 0) throw new Error(`${name} must be positive`);
    return result;
  }

  static text(value: string): string {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new Error('invalid XML character');
    }
    return value;
  }

  static id(value: string): string {
    Value.text(value);
    if (!value || /\s/u.test(value)) throw new Error('id must be non-empty and contain no whitespace');
    return value;
  }
}
