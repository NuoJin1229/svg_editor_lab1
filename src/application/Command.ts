import { DocumentSnapshot } from '../domain/DocumentSnapshot.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export interface CommandFeedback {
  readonly forward: string;
  readonly backward: string;
}

export abstract class Command {
  #before: DocumentSnapshot | undefined;
  #after: DocumentSnapshot | undefined;
  #feedback: CommandFeedback | undefined;

  execute(document: SvgDocument): string {
    if (this.#before) throw new Error('command has already executed');
    const before = new DocumentSnapshot(document);
    try {
      const feedback = this.apply(document);
      document.validate();
      const after = new DocumentSnapshot(document);
      this.#before = before;
      this.#after = after;
      this.#feedback = feedback;
      return feedback.forward;
    } catch (error) {
      before.restoreInto(document);
      throw error;
    }
  }

  undo(document: SvgDocument): string {
    if (!this.#before || !this.#feedback) throw new Error('command has not executed');
    this.#before.restoreInto(document);
    return this.#feedback.backward;
  }

  redo(document: SvgDocument): string {
    if (!this.#after || !this.#feedback) throw new Error('command has not executed');
    this.#after.restoreInto(document);
    return this.#feedback.forward;
  }

  protected abstract apply(document: SvgDocument): CommandFeedback;
}
