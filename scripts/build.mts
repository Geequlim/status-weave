import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, normalize, sep } from 'node:path';
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
await cp(join(root, 'packaging', 'spice', 'status-weave@geequlim', 'icons'), join(spice, 'icons'), {
	recursive: true,
});
await cp(
	join(root, 'packaging', 'spice', 'status-weave@geequlim', 'stylesheet.css'),
	join(spice, 'stylesheet.css'),
);

const compiledRoot = join(root, 'build');
const collectJavaScript = async (directory: string): Promise<string[]> => {
	const files: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (entry.name === 'spice') continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectJavaScript(path)));
		else if (entry.name.endsWith('.js')) files.push(path);
	}
	return files;
};

const rewriteRelativeRequires = (source: string, modulePath: string): string => {
	const moduleDirectory = dirname(modulePath);
	return source.replace(/require\("(\.{1,2}\/[^"]+)"\)/g, (_match, request: string) => {
		const resolved = normalize(join(moduleDirectory, request)).split(sep).join('/');
		return `require("./${resolved}")`;
	});
};

for (const sourceFile of await collectJavaScript(compiledRoot)) {
	const modulePath = sourceFile.slice(compiledRoot.length + 1);
	if (modulePath === 'index.js') continue;

	const targetPath = modulePath === 'applet/main.js' ? 'applet.js' : modulePath;
	const targetFile = join(spice, targetPath);
	const source = await readFile(sourceFile, 'utf8');
	const packagedSource = rewriteRelativeRequires(source, modulePath)
		.replace(/\n?\/\/# sourceMappingURL=.*$/, '')
		.concat('\n');
	await mkdir(dirname(targetFile), { recursive: true });
	await writeFile(targetFile, packagedSource);
}
console.log(`Built Cinnamon package: ${spice}`);
