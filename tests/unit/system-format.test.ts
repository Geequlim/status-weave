import { describe, expect, it } from 'vitest';
import {
	addMetricSlot,
	normalizeLayout,
	setSlotFormat,
	setSlotShowLabel,
	setSlotVisible,
} from '../../src/presentation/layout';
import {
	formatSystemLabel,
	formatSystemSlotPresentation,
	formatSystemTooltip,
} from '../../src/presentation/system-format';
import type { TelemetrySnapshot } from '../../src/telemetry/metrics/metric-sample';

const snapshot: TelemetrySnapshot = {
	sampledAt: 1,
	samples: [
		{
			metricId: 'cpu.usage',
			sourceId: 'system',
			sampledAt: 1,
			status: 'normal',
			value: { overallUsagePercent: 12.44, cores: [] },
		},
		{
			metricId: 'memory.usage',
			sourceId: 'system',
			sampledAt: 1,
			status: 'normal',
			value: {
				availableBytes: 3 * 1024 ** 3,
				buffersBytes: 0,
				cachedBytes: 0,
				freeBytes: 2 * 1024 ** 3,
				reclaimableBytes: 0,
				sharedBytes: 0,
				swapFreeBytes: 0,
				swapTotalBytes: 0,
				swapUsedBytes: 0,
				totalBytes: 8 * 1024 ** 3,
				usedBytes: 5 * 1024 ** 3,
				usagePercent: 62.5,
			},
		},
	],
};

describe('system label layout', () => {
	it('omits hidden metrics and trims an exposed separator', () => {
		const layout = setSlotVisible(normalizeLayout(undefined), 'cpu.usage', false);
		expect(formatSystemLabel(snapshot, layout)).toBe('RAM 5.0 / 8.0 GiB');
	});

	it('renders migrated metrics in their persisted order', () => {
		const layout = normalizeLayout([
			{ id: 'memory.usage', visible: true },
			{ id: 'separator.system', visible: true },
			{ id: 'cpu.usage', visible: true },
		]);
		expect(formatSystemLabel(snapshot, layout)).toBe('RAM 5.0 / 8.0 GiB  ·  CPU 12%');
	});

	it('renders independent formats for duplicate metrics', () => {
		let layout = addMetricSlot([], 'cpu.usage');
		layout = setSlotFormat(layout, 'cpu.usage', 'percent-precise');
		layout = addMetricSlot(layout, 'memory.usage');
		layout = setSlotFormat(layout, 'memory.usage', 'percent');
		layout = setSlotShowLabel(layout, 'memory.usage', false);
		expect(formatSystemLabel(snapshot, layout)).toBe('CPU 12.4%  63%');
	});

	it('supports all memory presentation presets', () => {
		const expected = {
			percent: 'RAM 63%',
			used: 'RAM 5.0 GiB',
			'used-total': 'RAM 5.0 / 8.0 GiB',
			available: 'RAM 可用 3.0 GiB',
		};
		for (const [format, label] of Object.entries(expected)) {
			const layout = setSlotFormat(addMetricSlot([], 'memory.usage'), 'memory.usage', format);
			expect(formatSystemLabel(snapshot, layout)).toBe(label);
		}
	});

	it('can hide the memory title independently from every value format', () => {
		const expected = {
			percent: '63%',
			used: '5.0 GiB',
			'used-total': '5.0 / 8.0 GiB',
			available: '可用 3.0 GiB',
		};
		for (const [format, label] of Object.entries(expected)) {
			let layout = setSlotFormat(addMetricSlot([], 'memory.usage'), 'memory.usage', format);
			layout = setSlotShowLabel(layout, 'memory.usage', false);
			expect(formatSystemLabel(snapshot, layout)).toBe(label);
		}
	});

	it('keeps a stable width class while values change status', () => {
		const slot = addMetricSlot([], 'cpu.usage')[0]!;
		if (slot.kind !== 'metric') throw new Error('Expected a metric slot');
		expect(formatSystemSlotPresentation(snapshot, slot)).toEqual({
			label: 'CPU',
			status: 'normal',
			value: '12%',
			widthClass: 'percent',
		});
	});

	it('describes full metric identity, source, unit, state, and failure reason', () => {
		const failed: TelemetrySnapshot = {
			sampledAt: 2,
			samples: [
				{
					error: '模拟数据源暂时不可用',
					metricId: 'demo.status',
					sampledAt: 2,
					sourceId: 'synthetic',
					status: 'unavailable',
					value: null,
				},
			],
		};
		const tooltip = formatSystemTooltip(failed, 7, addMetricSlot([], 'demo.status'));
		expect(tooltip).toContain('状态演示（虚拟数据源，%）');
		expect(tooltip).toContain('— · 不可用');
		expect(tooltip).toContain('原因：模拟数据源暂时不可用');
	});

	it('uses the synthetic metric to exercise future unit families', () => {
		const demo: TelemetrySnapshot = {
			sampledAt: 3,
			samples: [
				{
					metricId: 'demo.status',
					sampledAt: 3,
					sourceId: 'synthetic',
					status: 'normal',
					value: {
						bytes: 7.4 * 1024 ** 3,
						bytesPerSecond: 125.6 * 1024 ** 2,
						percentage: 42,
						rpm: 1420,
						temperatureCelsius: 68.4,
					},
				},
			],
		};
		const expected = {
			temperature: '演示 68.4 °C',
			bytes: '演示 7.4 GiB',
			rate: '演示 125.6 MiB/s',
			rpm: '演示 1420 RPM',
		};
		for (const [format, value] of Object.entries(expected)) {
			const layout = setSlotFormat(addMetricSlot([], 'demo.status'), 'demo.status', format);
			expect(formatSystemLabel(demo, layout)).toBe(value);
		}
	});
});
