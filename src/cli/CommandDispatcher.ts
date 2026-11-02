import { EditorService } from '../application/EditorService.js';
import { CommandTokenizer, type Token } from './CommandTokenizer.js';

interface CommandDefinition {
  readonly syntax: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly run: (args: readonly Token[]) => string | Promise<string>;
}

export class CommandDispatcher {
  readonly #tokenizer = new CommandTokenizer();
  readonly #commands: ReadonlyMap<string, CommandDefinition>;

  constructor(private readonly editor: EditorService) {
    // The only command-name dispatch site. Future phase: external command registration.
    this.#commands = new Map<string, CommandDefinition>([
      [
        'init',
        {
          syntax: 'init [w] [h]',
          minimum: 0,
          maximum: 2,
          run: (a) => editor.init(a[0]?.value, a[1]?.value),
        },
      ],
      [
        'read',
        { syntax: 'read <file.svg>', minimum: 1, maximum: 1, run: (a) => editor.read(a[0]!.value) },
      ],
      [
        'save',
        { syntax: 'save [file.svg]', minimum: 0, maximum: 1, run: (a) => editor.save(a[0]?.value) },
      ],
      [
        'canvas',
        {
          syntax: 'canvas [w] [h]',
          minimum: 0,
          maximum: 2,
          run: (a) => editor.canvas(a[0]?.value, a[1]?.value),
        },
      ],
      [
        'create',
        {
          syntax: 'create <type> <id> [params...] [in <containerId>]',
          minimum: 2,
          maximum: Infinity,
          run: (a) => this.create(a),
        },
      ],
      [
        'delete',
        { syntax: 'delete <id>', minimum: 1, maximum: 1, run: (a) => editor.delete(a[0]!.value) },
      ],
      [
        'move',
        {
          syntax: 'move <id> <dx> <dy>',
          minimum: 3,
          maximum: 3,
          run: (a) => editor.move(a[0]!.value, a[1]!.value, a[2]!.value),
        },
      ],
      [
        'scale',
        {
          syntax: 'scale <id> <factor>',
          minimum: 2,
          maximum: 2,
          run: (a) => editor.scale(a[0]!.value, a[1]!.value),
        },
      ],
      [
        'set',
        {
          syntax: 'set <id> <attr> <value>',
          minimum: 3,
          maximum: 3,
          run: (a) => editor.set(a[0]!.value, a[1]!.value, a[2]!.value),
        },
      ],
      [
        'group',
        {
          syntax: 'group <newGid> <id1> [id2...]',
          minimum: 2,
          maximum: Infinity,
          run: (a) =>
            editor.group(
              a[0]!.value,
              a.slice(1).map((t) => t.value),
            ),
        },
      ],
      [
        'ungroup',
        {
          syntax: 'ungroup <gid>',
          minimum: 1,
          maximum: 1,
          run: (a) => editor.ungroup(a[0]!.value),
        },
      ],
      [
        'addto',
        {
          syntax: 'addto <gid> <id>',
          minimum: 2,
          maximum: 2,
          run: (a) => editor.addto(a[0]!.value, a[1]!.value),
        },
      ],
      [
        'front',
        { syntax: 'front <id>', minimum: 1, maximum: 1, run: (a) => editor.front(a[0]!.value) },
      ],
      [
        'back',
        { syntax: 'back <id>', minimum: 1, maximum: 1, run: (a) => editor.back(a[0]!.value) },
      ],
      [
        'tree',
        { syntax: 'tree [id]', minimum: 0, maximum: 1, run: (a) => editor.tree(a[0]?.value) },
      ],
      [
        'show',
        { syntax: 'show <id>', minimum: 1, maximum: 1, run: (a) => editor.show(a[0]!.value) },
      ],
      [
        'help',
        {
          syntax: 'help',
          minimum: 0,
          maximum: 0,
          run: () => [...this.#commands.values()].map((command) => command.syntax).join('\n'),
        },
      ],
      ['undo', { syntax: 'undo', minimum: 0, maximum: 0, run: () => editor.undo() }],
      ['redo', { syntax: 'redo', minimum: 0, maximum: 0, run: () => editor.redo() }],
    ]);
  }

  async execute(line: string): Promise<string | undefined> {
    const tokens = this.#tokenizer.tokenize(line);
    if (!tokens.length) return undefined;
    const name = tokens[0]!.value;
    const definition = this.#commands.get(name);
    if (!definition) throw new Error(`unknown command: ${name}`);
    if (name !== 'init' && name !== 'read') this.editor.requireDocument();
    const args = tokens.slice(1);
    if (args.length < definition.minimum || args.length > definition.maximum)
      throw new Error(`usage: ${definition.syntax}`);
    return definition.run(args);
  }

  private create(args: readonly Token[]): string {
    const parameters = args.slice(2);
    let parent: string | undefined;
    const marker = parameters.at(-2);
    if (marker?.value === 'in' && !marker.quoted) {
      parent = parameters.at(-1)!.value;
      parameters.splice(-2);
    }
    return this.editor.create(
      args[0]!.value,
      args[1]!.value,
      parameters.map((token) => token.value),
      parent,
    );
  }
}
