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

const rewriteRelativeRequires = (
	source: string,
	modulePath: string,
	formatImport: (resolved: string) => string,
): string => {
	const moduleDirectory = dirname(modulePath);
	return source.replace(/require\("(\.{1,2}\/[^"]+)"\)/g, (_match, request: string) => {
		const resolved = normalize(join(moduleDirectory, request)).split(sep).join('/');
		return formatImport(resolved);
	});
};

// Cinnamon 6.8 imports files natively and only exposes top-level var/functions.
const nativeSpice = join(spice, '6.8');
// Cinnamon clears the top-level import cache on reload.
const nativeModuleName = (path: string) => `module-${path.replaceAll('/', '__')}`;
await mkdir(nativeSpice);
for (const entry of ['settings-schema.json', 'icons', 'stylesheet.css']) {
	await cp(join(spice, entry), join(nativeSpice, entry), { recursive: true });
}
for (const sourceFile of await collectJavaScript(compiledRoot)) {
	const modulePath = sourceFile.slice(compiledRoot.length + 1);
	if (modulePath === 'index.js') continue;

	const isEntry = modulePath === 'applet/main.js';
	const legacyFile = join(spice, isEntry ? 'applet.js' : modulePath);
	const nativeFile = join(nativeSpice, nativeModuleName(modulePath));
	const source = (await readFile(sourceFile, 'utf8')).replace(
		/\n?\/\/# sourceMappingURL=.*$/,
		'',
	);
	const legacySource = rewriteRelativeRequires(
		source,
		modulePath,
		(resolved) => `require("./${resolved}")`,
	);
	const nativeSource = rewriteRelativeRequires(
		source,
		modulePath,
		(resolved) => `xletImports[${JSON.stringify(nativeModuleName(resolved))}].cjsExports`,
	);
	await mkdir(dirname(legacyFile), { recursive: true });
	await writeFile(legacyFile, `${legacySource}\n`);
	await writeFile(
		nativeFile,
		`var cjsExports = (function (exports, xletImports) {\n${
			nativeSource
		}\nreturn exports;\n})({}, imports.ui.extension.getCurrentExtension().imports);\n`,
	);
}
await writeFile(
	join(nativeSpice, 'applet.js'),
	'function main(...args) {\n\treturn imports.ui.extension.getCurrentExtension().imports["module-applet__main"].cjsExports.main(...args);\n}\n',
);
console.log(`Built Cinnamon package: ${spice}`);
