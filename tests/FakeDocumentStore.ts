import type { DocumentStore, LoadedDocument } from '../src/application/ports/DocumentStore.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

export class FakeDocumentStore implements DocumentStore {
  readonly files = new Map<string, SvgDocument>();
  fail = false;
  async read(path: string): Promise<LoadedDocument> {
    const document = this.files.get(path);
    if (this.fail || !document) throw new Error(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: [] };
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    if (this.fail) throw new Error(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
  }
}
