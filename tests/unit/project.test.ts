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
		};
		expect(metadata.uuid).toBe('status-weave@geequlim');
		expect(metadata.name).toBe('Status Weave');
	});
});
