import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spice = join(root, 'build', 'spice', 'status-weave@geequlim');
const applet = join(spice, 'applet.js');
const validation = `
const FileUtils = imports.misc.fileUtils;
const moduleIndex = FileUtils.requireModule(
	${JSON.stringify(applet)},
	${JSON.stringify(spice)},
	{},
	'applet',
	false,
	true
);
const appletModule = FileUtils.getModuleByIndex(moduleIndex);
if (!appletModule || typeof appletModule.main !== 'function')
	throw new Error('Status Weave applet module does not export main');
print('Cinnamon module validation passed: index=' + moduleIndex);
`;

const child = spawn('cjs', ['-I', '/usr/share/cinnamon/js', '-c', validation], {
	cwd: root,
	stdio: 'inherit',
});
await new Promise<void>((resolve, reject) => {
	child.on('exit', (code) =>
		code === 0 ? resolve() : reject(new Error(`Cinnamon validation exited with ${code}`)),
	);
	child.on('error', reject);
});
