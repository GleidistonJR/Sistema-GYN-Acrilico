import { fileURLToPath } from 'node:url';

// Never depend on the directory used by a shortcut, terminal or Windows startup.
export const projectPath = fileURLToPath(new URL('../', import.meta.url));
export const sessionPath = fileURLToPath(new URL('../.whatsapp-session/', import.meta.url));
