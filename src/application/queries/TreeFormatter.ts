import { Shape } from '../../domain/Shape.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class TreeFormatter {
  format(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    if (id !== undefined) {
      const shape = document.find(id);
      lines.push(shape.summary());
      this.append(shape.children, '', lines);
    } else {
      lines.push(`svg (${document.width}x${document.height})`);
      this.append(document.roots, '', lines);
    }
    return lines.join('\n');
  }

  private append(shapes: readonly Shape[], prefix: string, lines: string[]): void {
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${shape.summary()}`);
      this.append(shape.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
