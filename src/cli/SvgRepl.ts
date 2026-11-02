import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { CommandDispatcher } from './CommandDispatcher.js';

export class SvgRepl {
  constructor(private readonly dispatcher: CommandDispatcher) {}

  async run(input: Readable, output: Writable): Promise<void> {
    const lines = createInterface({ input, crlfDelay: Infinity, terminal: false });
    output.write("svg-editor 0.1 — type 'help' for commands\nsvg> ");
    try {
      for await (const line of lines) {
        try {
          const result = await this.dispatcher.execute(line);
          if (result !== undefined) output.write(`${result}\n`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'command failed';
          output.write(`error: ${message.replace(/[\r\n\u0085\u2028\u2029]+/g, ' ')}\n`);
        }
        output.write('svg> ');
      }
    } finally { lines.close(); }
  }
}
