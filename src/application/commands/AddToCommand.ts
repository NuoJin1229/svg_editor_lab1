import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class AddToCommand extends Command {
  constructor(
    private readonly containerId: string,
    private readonly id: string,
  ) {
    super();
  }
  protected override apply(document: SvgDocument): CommandFeedback {
    const label = document.find(this.id).label;
    const oldParent = document.parent(this.id)?.label ?? 'svg';
    document.addTo(this.containerId, this.id);
    return {
      forward: `${label} moved into g#${this.containerId}`,
      backward: `${label} restored into ${oldParent}`,
    };
  }
}
