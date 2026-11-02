import { Command, type CommandFeedback } from '../Command.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import { SvgDocument } from '../../domain/SvgDocument.js';

export class CreateShapeCommand extends Command {
  constructor(
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    private readonly parameters: readonly string[],
    private readonly parentId?: string,
  ) {
    super();
  }
  protected override apply(document: SvgDocument): CommandFeedback {
    const shape = this.factory.create(this.type, this.id, this.parameters);
    document.add(shape, this.parentId);
    const suffix = this.parentId === undefined ? '' : ` in g#${this.parentId}`;
    return { forward: `${shape.label} created${suffix}`, backward: `${shape.label} removed` };
  }
}
