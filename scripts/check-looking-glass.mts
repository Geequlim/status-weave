import { spawn } from 'node:child_process';

const child = spawn(
	'journalctl',
	['--user', '-b', '--since', '2 minutes ago', '--grep', 'status-weave@geequlim', '--no-pager'],
	{ stdio: ['ignore', 'pipe', 'inherit'] },
);

let output = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk: string) => {
	output += chunk;
});

const exitCode = await new Promise<number | null>((resolve, reject) => {
	child.on('exit', resolve);
	child.on('error', reject);
});
if (exitCode !== 0 && exitCode !== 1) throw new Error(`journalctl exited with ${exitCode}`);

const log = output.trim();
if (!log) {
	console.log('No recent Status Weave Looking Glass entries');
} else {
	console.log(log);
}

if (log.includes('[LookingGlass/error]') || log.includes('Error importing')) {
	throw new Error('Recent Looking Glass errors detected');
}
