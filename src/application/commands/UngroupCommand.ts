import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class UngroupCommand extends Command {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): CommandFeedback {
    document.ungroup(this.id);
    return { forward: `g#${this.id} ungrouped`, backward: `g#${this.id} restored` };
  }
}
