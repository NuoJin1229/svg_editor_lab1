import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class MoveShapeCommand extends Command {
  constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super();
  }
  protected override apply(document: SvgDocument): CommandFeedback {
    const shape = document.find(this.id);
    shape.move(this.dx, this.dy);
    return {
      forward: `${shape.label} moved by (${this.dx},${this.dy})`,
      backward: `${shape.label} moved back by (${-this.dx},${-this.dy})`,
    };
  }
}
