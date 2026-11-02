import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class FrontCommand extends Command {
  constructor(private readonly id: string) {
    super();
  }
  protected override apply(document: SvgDocument): CommandFeedback {
    const label = document.find(this.id).label;
    document.front(this.id);
    return { forward: `${label} brought to front`, backward: `${label} order restored` };
  }
}
