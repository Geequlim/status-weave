import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (command: string, args: string[]) =>
	new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
		child.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)),
		);
		child.on('error', reject);
	});

await rm(join(root, 'build'), { recursive: true, force: true });
const yarnArgs = ['tsc', '-p', 'tsconfig.json'];
const yarnCommand = process.env.npm_execpath ?? 'yarn';
await run(yarnCommand, yarnArgs);
const spice = join(root, 'build', 'spice', 'status-weave@geequlim');
await mkdir(spice, { recursive: true });
await cp(
	join(root, 'packaging', 'spice', 'status-weave@geequlim', 'metadata.json'),
	join(spice, 'metadata.json'),
);
await cp(
	join(root, 'packaging', 'spice', 'status-weave@geequlim', 'settings-schema.json'),
	join(spice, 'settings-schema.json'),
);
await cp(join(root, 'build', 'settings'), join(spice, 'settings'), { recursive: true });
await cp(join(root, 'build', 'platform'), join(spice, 'platform'), { recursive: true });
const main = await readFile(join(root, 'build', 'applet', 'main.js'), 'utf8');
const packagedMain = main
	.replaceAll('require("../settings/', 'require("./settings/')
	.replaceAll('require("../platform/', 'require("./platform/')
	.concat('\n');
await writeFile(join(spice, 'applet.js'), packagedMain);
for (const modulePath of ['settings/instance-config.js', 'platform/cinnamon.js']) {
	const moduleFile = join(spice, modulePath);
	const moduleSource = await readFile(moduleFile, 'utf8');
	if (!moduleSource.endsWith('\n')) await writeFile(moduleFile, `${moduleSource}\n`);
}
console.log(`Built Cinnamon package: ${spice}`);
