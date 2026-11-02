import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class DeleteShapeCommand extends Command {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): CommandFeedback {
    const label = document.find(this.id).label;
    const parent = document.parent(this.id)?.label ?? 'svg';
    document.delete(this.id);
    return { forward: `${label} deleted`, backward: `${label} restored into ${parent}` };
  }
}
