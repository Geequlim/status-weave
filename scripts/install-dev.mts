import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = join(root, 'build', 'spice', 'status-weave@geequlim');
const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? '.', '.local', 'share');
const target = join(dataHome, 'cinnamon', 'applets', 'status-weave@geequlim');

async function run(command: string, args: string[], failure: string): Promise<void> {
	const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
	await new Promise<void>((resolve, reject) => {
		child.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`${failure} (exit code ${code})`)),
		);
		child.on('error', reject);
	});
}

const yarnArgs = ['tiny', 'build'];
const yarnCommand = process.env.npm_execpath ?? 'yarn';
await run(yarnCommand, yarnArgs, 'Build failed');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Installed development applet to ${target}`);

await run(
	'gdbus',
	[
		'call',
		'--session',
		'--dest',
		'org.Cinnamon',
		'--object-path',
		'/org/Cinnamon',
		'--method',
		'org.Cinnamon.ReloadXlet',
		'status-weave@geequlim',
		'APPLET',
	],
	'Cinnamon applet reload failed; the installed code may not be active',
);
console.log('Reloaded status-weave@geequlim in Cinnamon');

await run(
	'gdbus',
	[
		'call',
		'--session',
		'--dest',
		'org.Cinnamon',
		'--object-path',
		'/org/Cinnamon',
		'--method',
		'org.Cinnamon.ReloadTheme',
	],
	'Cinnamon theme reload failed; the installed stylesheet may not be active',
);
console.log('Reloaded Cinnamon theme and applet stylesheets');
