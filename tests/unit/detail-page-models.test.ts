import { describe, expect, it } from 'vitest';
import {
	calculateCpuCoreColumnCount,
	createCpuUsagePageModel,
} from '../../src/details/pages/cpu-usage/model';
import { createMemoryUsagePageModel } from '../../src/details/pages/memory-usage/model';
import type { MetricSample } from '../../src/telemetry/metrics/metric-sample';

describe('detail page models', () => {
	it('keeps CPU cores on screen by adding columns only when height requires it', () => {
		expect(calculateCpuCoreColumnCount(16, 850)).toBe(1);
		expect(calculateCpuCoreColumnCount(32, 850)).toBe(2);
		expect(calculateCpuCoreColumnCount(16, 500)).toBe(2);
		expect(calculateCpuCoreColumnCount(128, 500)).toBe(4);
	});

	it('formats aggregate and per-core CPU values', () => {
		const sample: MetricSample<'cpu.usage'> = {
			metricId: 'cpu.usage',
			sourceId: 'system',
			sampledAt: 123,
			status: 'normal',
			value: {
				overallUsagePercent: 20.25,
				cores: [
					{ frequencyHertz: 400_000_000, id: 'cpu0', index: 0, usagePercent: 10 },
					{ frequencyHertz: null, id: 'cpu1', index: 1, usagePercent: 30.5 },
				],
			},
		};
		expect(createCpuUsagePageModel(sample)).toEqual({
			cores: [
				{
					frequency: '0.40 GHz',
					id: 'cpu0',
					label: '核心 0',
					usage: '10.0%',
				},
				{ frequency: '—', id: 'cpu1', label: '核心 1', usage: '30.5%' },
			],
			overall: '20.3%',
			sampledAt: 123,
			status: '正常',
		});
	});

	it('formats all memory detail fields independently', () => {
		const gib = 1024 ** 3;
		const sample: MetricSample<'memory.usage'> = {
			metricId: 'memory.usage',
			sourceId: 'system',
			sampledAt: 456,
			status: 'normal',
			value: {
				availableBytes: 6 * gib,
				buffersBytes: 0.2 * gib,
				cachedBytes: 2 * gib,
				freeBytes: 1 * gib,
				reclaimableBytes: 0.5 * gib,
				sharedBytes: 0.1 * gib,
				swapFreeBytes: 3 * gib,
				swapTotalBytes: 4 * gib,
				swapUsedBytes: 1 * gib,
				totalBytes: 8 * gib,
				usedBytes: 2 * gib,
				usagePercent: 25,
			},
		};
		expect(createMemoryUsagePageModel(sample)).toMatchObject({
			sampledAt: 456,
			status: '正常',
			rows: [
				{ id: 'usagePercent', value: '25.0%' },
				{ id: 'usedBytes', value: '2.0 GiB' },
				{ id: 'availableBytes', value: '6.0 GiB' },
				{ id: 'totalBytes', value: '8.0 GiB' },
				{ id: 'freeBytes', value: '1.0 GiB' },
				{ id: 'cachedBytes', value: '2.0 GiB' },
				{ id: 'buffersBytes', value: '0.2 GiB' },
				{ id: 'reclaimableBytes', value: '0.5 GiB' },
				{ id: 'sharedBytes', value: '0.1 GiB' },
				{ id: 'swapUsedBytes', value: '1.0 GiB' },
				{ id: 'swapTotalBytes', value: '4.0 GiB' },
			],
		});
	});
});
