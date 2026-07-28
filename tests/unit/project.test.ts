import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(fileURLToPath(new URL('../..', import.meta.url)));

describe('project scaffold', () => {
	it('contains a valid Cinnamon package definition', async () => {
		const metadataPath = join(root, 'packaging/spice/status-weave@geequlim/metadata.json');
		await access(metadataPath);
		const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
			uuid?: string;
			name?: string;
			'max-instances'?: number;
		};
		expect(metadata.uuid).toBe('status-weave@geequlim');
		expect(metadata.name).toBe('Status Weave');
		expect(metadata['max-instances']).toBe(-1);
	});

	it('vendors all metric icon styles with their license', async () => {
		const iconRoot = join(root, 'packaging/spice/status-weave@geequlim/icons/phosphor');
		for (const style of ['regular', 'bold', 'fill']) {
			for (const metric of ['cpu', 'memory', 'temperature', 'fan', 'gpu']) {
				const svg = await readFile(join(iconRoot, style, `${metric}-symbolic.svg`), 'utf8');
				expect(svg).toContain('<svg');
				expect(svg).toContain('currentColor');
			}
		}
		expect(await readFile(join(iconRoot, 'LICENSE'), 'utf8')).toContain('MIT License');
	});
});
