import { EditorService } from './application/EditorService.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { SvgRepl } from './cli/SvgRepl.js';
import { FileDocumentStore } from './infrastructure/FileDocumentStore.js';

const editor = new EditorService(new FileDocumentStore());
const repl = new SvgRepl(new CommandDispatcher(editor));
await repl.run(process.stdin, process.stdout);
