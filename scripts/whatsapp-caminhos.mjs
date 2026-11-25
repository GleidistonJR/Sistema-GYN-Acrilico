import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Never depend on the directory used by a shortcut, terminal or Windows startup.
export const projectPath = fileURLToPath(new URL('../', import.meta.url));
export const sessionPath = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.env.WHATSAPP_SESSION_PATH)
  : fileURLToPath(new URL('../.whatsapp-session/', import.meta.url));
