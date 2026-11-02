export interface Token {
  readonly value: string;
  readonly quoted: boolean;
}

export class CommandTokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let value = '';
    let active = false;
    let quoted = false;
    let inside = false;
    let closed = false;
    const flush = (): void => {
      if (active) tokens.push({ value, quoted });
      value = '';
      active = false;
      quoted = false;
      closed = false;
    };
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (inside) {
        if (character === '"') {
          inside = false;
          closed = true;
        } else if (character === '\\' && ['"', '\\'].includes(line[index + 1] ?? ''))
          value += line[++index]!;
        else value += character;
      } else if (/\s/u.test(character)) flush();
      else if (closed) throw new Error('expected whitespace after closing quote');
      else if (character === '"') {
        if (active) throw new Error('quotes must enclose a complete argument');
        active = true;
        quoted = true;
        inside = true;
      } else {
        active = true;
        value += character;
      }
    }
    if (inside) throw new Error('unclosed double quote');
    flush();
    return tokens;
  }
}
