import { readFile, open, rename, unlink, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DocumentStore, LoadedDocument } from '../application/ports/DocumentStore.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { SvgParser } from './SvgParser.js';
import { SvgSerializer } from './SvgSerializer.js';

export class FileDocumentStore implements DocumentStore {
  readonly #parser = new SvgParser();
  readonly #serializer = new SvgSerializer();

  async read(path: string): Promise<LoadedDocument> {
    let source: string;
    try {
      const bytes = await readFile(path);
      source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`cannot read file: ${path}`);
    }
    return this.#parser.parse(source);
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    const source = this.#serializer.serialize(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      const existing = await stat(path).catch(error => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      });
      if (existing && !existing.isFile()) throw new Error('target is not a regular file');
      const handle = await open(temporary, 'wx', existing?.mode ?? 0o666);
      try {
        await handle.writeFile(source, 'utf8');
        await handle.sync();
      } finally { await handle.close(); }
      await rename(temporary, path);
    } catch (cause) {
      await unlink(temporary).catch(() => undefined);
      throw new Error(`cannot write file: ${path}`, { cause });
    }
  }
}
