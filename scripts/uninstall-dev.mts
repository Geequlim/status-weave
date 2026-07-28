import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const appletUuid = 'status-weave@geequlim';
const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? '.', '.local', 'share');
const target = join(dataHome, 'cinnamon', 'applets', appletUuid);

await rm(target, { recursive: true, force: true });
console.log(`Uninstalled development applet from ${target}`);
