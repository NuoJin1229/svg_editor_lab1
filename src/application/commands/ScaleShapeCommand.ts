import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class ScaleShapeCommand extends Command {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(document: SvgDocument): CommandFeedback {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    return { forward: `${shape.label} scaled by ${this.factor}`, backward: `${shape.label} scale restored` };
  }
}
