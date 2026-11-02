import { Command, type CommandFeedback } from '../Command.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class SetAttributeCommand extends Command {
  constructor(private readonly id: string, private readonly name: string, private readonly value: string) { super(); }
  protected override apply(document: SvgDocument): CommandFeedback {
    const shape = document.find(this.id);
    const old = this.name === 'text' ? shape.textContent : shape.attributes()[this.name];
    shape.setAttribute(this.name, this.value);
    return { forward: `${shape.label} updated: ${this.name}=${JSON.stringify(this.value)}`,
      backward: `${shape.label} updated: ${this.name}=${old === undefined ? '(unset)' : JSON.stringify(old)}` };
  }
}
