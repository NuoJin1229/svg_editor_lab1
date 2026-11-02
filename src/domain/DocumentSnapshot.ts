import { SvgDocument } from './SvgDocument.js';

export class DocumentSnapshot {
  readonly #document: SvgDocument;
  constructor(document: SvgDocument) {
    this.#document = document.clone();
  }
  restoreInto(document: SvgDocument): void {
    document.restore(this.#document);
  }
}
