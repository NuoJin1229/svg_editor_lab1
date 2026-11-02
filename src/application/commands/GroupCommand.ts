import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class GroupCommand extends Command {
  constructor(private readonly id: string, private readonly targets: readonly string[]) { super(); }
  protected override apply(document: SvgDocument): CommandFeedback {
    const group = document.group(this.id, this.targets);
    return { forward: `${group.label} created with ${group.children.length} children`, backward: `${group.label} grouping undone` };
  }
}
