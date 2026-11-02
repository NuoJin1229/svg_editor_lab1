import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Value } from '../domain/Value.js';
import { Command } from './Command.js';
import { HistoryManager } from './HistoryManager.js';
import type { DocumentStore } from './ports/DocumentStore.js';
import { TreeFormatter } from './queries/TreeFormatter.js';
import { ShowFormatter } from './queries/ShowFormatter.js';
import { CreateShapeCommand } from './commands/CreateShapeCommand.js';
import { DeleteShapeCommand } from './commands/DeleteShapeCommand.js';
import { MoveShapeCommand } from './commands/MoveShapeCommand.js';
import { ScaleShapeCommand } from './commands/ScaleShapeCommand.js';
import { SetAttributeCommand } from './commands/SetAttributeCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';

export class EditorService {
  #document: SvgDocument | undefined;
  #path: string | undefined;
  readonly #history = new HistoryManager();
  readonly #factory = new ShapeFactory();
  readonly #tree = new TreeFormatter();
  readonly #show = new ShowFormatter();

  constructor(private readonly store: DocumentStore) {}

  requireDocument(): SvgDocument {
    if (!this.#document) throw new Error("no document. use 'init' or 'read' first");
    return this.#document;
  }

  get session(): Readonly<{ path: string | undefined; undo: number; redo: number; blocked: boolean }> {
    return { path: this.#path, ...this.#history.state };
  }

  init(width = '800', height = '600'): string {
    const document = new SvgDocument(Value.positive(width, 'width'), Value.positive(height, 'height'));
    this.#document = document;
    this.#path = undefined;
    this.#history.barrier();
    return `canvas ${document.width}x${document.height} created`;
  }

  async read(path: string): Promise<string> {
    const result = await this.store.read(path);
    result.document.validate();
    this.#document = result.document;
    this.#path = path;
    this.#history.barrier();
    return [...result.warnings, `read ${path} (${result.document.count} elements)`].join('\n');
  }

  async save(path?: string): Promise<string> {
    const document = this.requireDocument();
    const target = path ?? this.#path;
    if (!target) throw new Error('no file path. use save <file.svg> first');
    await this.store.write(target, document);
    this.#path ??= target;
    this.#history.barrier();
    return `saved to ${target} (${document.count} elements)`;
  }

  canvas(width?: string, height?: string): string {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('canvas requires both width and height');
    document.resize(Value.positive(width, 'width'), Value.positive(height, 'height'));
    this.#history.barrier();
    return `canvas resized to ${document.width}x${document.height}`;
  }

  create(type: string, id: string, parameters: readonly string[], parent?: string): string {
    return this.edit(new CreateShapeCommand(this.#factory, type, id, parameters, parent));
  }
  delete(id: string): string { return this.edit(new DeleteShapeCommand(id)); }
  move(id: string, dx: string, dy: string): string { return this.edit(new MoveShapeCommand(id, Value.number(dx, 'dx'), Value.number(dy, 'dy'))); }
  scale(id: string, factor: string): string { return this.edit(new ScaleShapeCommand(id, Value.positive(factor, 'scale factor'))); }
  set(id: string, attribute: string, value: string): string { return this.edit(new SetAttributeCommand(id, attribute, value)); }
  group(id: string, targets: readonly string[]): string { return this.edit(new GroupCommand(id, targets)); }
  ungroup(id: string): string { return this.edit(new UngroupCommand(id)); }
  addto(container: string, id: string): string { return this.edit(new AddToCommand(container, id)); }
  front(id: string): string { return this.edit(new FrontCommand(id)); }
  back(id: string): string { return this.edit(new BackCommand(id)); }
  tree(id?: string): string { return this.#tree.format(this.requireDocument(), id); }
  show(id: string): string { return this.#show.format(this.requireDocument(), id); }
  undo(): string { return this.#history.undo(this.requireDocument()); }
  redo(): string { return this.#history.redo(this.requireDocument()); }

  private edit(command: Command): string { return this.#history.execute(command, this.requireDocument()); }
}
