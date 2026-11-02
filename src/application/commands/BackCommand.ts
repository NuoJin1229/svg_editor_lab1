import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class BackCommand extends Command {
  constructor(private readonly id: string) {
    super();
  }
  protected override apply(document: SvgDocument): CommandFeedback {
    const label = document.find(this.id).label;
    document.back(this.id);
    return { forward: `${label} sent to back`, backward: `${label} order restored` };
  }
}
