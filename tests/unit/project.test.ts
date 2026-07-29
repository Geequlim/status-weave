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
			for (const icon of [
				'arrow-down',
				'arrow-up',
				'cpu',
				'memory',
				'temperature',
				'fan',
				'gpu',
				'network',
			]) {
				const svg = await readFile(join(iconRoot, style, `${icon}-symbolic.svg`), 'utf8');
				expect(svg).toContain('<svg');
				expect(svg).toContain('currentColor');
			}
		}
		expect(await readFile(join(iconRoot, 'LICENSE'), 'utf8')).toContain('MIT License');
	});

	it('configures one shared icon style while layouts only toggle icons', async () => {
		const schemaPath = join(root, 'packaging/spice/status-weave@geequlim/settings-schema.json');
		const schema = JSON.parse(await readFile(schemaPath, 'utf8')) as {
			'icon-style'?: {
				default?: string;
				options?: Record<string, string>;
				type?: string;
			};
			layout?: { default?: Array<Record<string, unknown>> };
		};
		expect(schema['icon-style']).toMatchObject({
			type: 'combobox',
			default: 'regular',
			options: { 线性: 'regular', 粗线: 'bold', 填充: 'fill' },
		});
		expect(schema.layout?.default?.every((slot) => !('iconStyle' in slot))).toBe(true);
		expect(schema.layout?.default?.filter((slot) => slot.kind === 'metric')).toEqual(
			expect.arrayContaining([expect.objectContaining({ showIcon: true })]),
		);
	});

	it('reserves stable panel widths for short percentage values', async () => {
		const stylesheet = await readFile(
			join(root, 'packaging/spice/status-weave@geequlim/stylesheet.css'),
			'utf8',
		);
		const integerPercentageRule = stylesheet.match(
			/([^{}]+)\{([^{}]*min-width:\s*2\.75em;[^{}]*)\}/,
		);
		expect(integerPercentageRule?.[1]).toContain('.status-weave-value-percent');
		expect(integerPercentageRule?.[1]).toContain('.status-weave-value-memory-percent');
		expect(integerPercentageRule?.[1]).toContain('.status-weave-value-gpu-utilization');
		expect(integerPercentageRule?.[1]).toContain('.status-weave-value-gpu-memory-percent');
		expect(integerPercentageRule?.[1]).toContain('.status-weave-value-gpu-fan-speed');
		expect(integerPercentageRule?.[2]).toContain('text-align: right');
		expect(stylesheet).toMatch(
			/\.status-weave-value\.status-weave-value-percent-precise\s*\{[^{}]*min-width:\s*4em;[^{}]*text-align:\s*right;/,
		);
	});
});
