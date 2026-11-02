import { Command } from './Command.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class HistoryManager {
  readonly #undo: Command[] = [];
  readonly #redo: Command[] = [];
  #blocked = true;

  get state(): Readonly<{ undo: number; redo: number; blocked: boolean }> {
    return { undo: this.#undo.length, redo: this.#redo.length, blocked: this.#blocked };
  }

  barrier(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#blocked = true;
  }

  execute(command: Command, document: SvgDocument): string {
    const result = command.execute(document);
    this.#undo.push(command);
    this.#redo.length = 0;
    this.#blocked = false;
    return result;
  }

  undo(document: SvgDocument): string {
    this.requireAllowed();
    const command = this.#undo.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo(document);
    this.#undo.pop();
    this.#redo.push(command);
    return result;
  }

  redo(document: SvgDocument): string {
    this.requireAllowed();
    const command = this.#redo.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo(document);
    this.#redo.pop();
    this.#undo.push(command);
    return result;
  }

  private requireAllowed(): void {
    if (this.#blocked) throw new Error('undo not allowed after io command');
  }
}
