import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = join(root, 'build', 'spice', 'status-weave@geequlim');
const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? '.', '.local', 'share');
const target = join(dataHome, 'cinnamon', 'applets', 'status-weave@geequlim');

const yarnArgs = ['tiny', 'build'];
const yarnCommand = process.env.npm_execpath ?? 'yarn';
const child = spawn(yarnCommand, yarnArgs, { cwd: root, stdio: 'inherit' });
await new Promise<void>((resolve, reject) => {
	child.on('exit', (code) =>
		code === 0 ? resolve() : reject(new Error(`build exited with ${code}`)),
	);
	child.on('error', reject);
});
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Installed development applet to ${target}`);
