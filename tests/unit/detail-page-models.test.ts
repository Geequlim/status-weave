import { describe, expect, it } from 'vitest';
import {
	calculateCpuCoreColumnCount,
	createCpuUsagePageModel,
} from '../../src/details/pages/cpu-usage/model';
import { createFanPageModel } from '../../src/details/pages/fan/model';
import { createMemoryUsagePageModel } from '../../src/details/pages/memory-usage/model';
import {
	calculateTemperatureColumnCount,
	createTemperaturePageModel,
} from '../../src/details/pages/temperature/model';
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

	it('formats temperature sensors and fits them into bounded columns', () => {
		const sample: MetricSample<'temperature.hwmon'> = {
			metricId: 'temperature.hwmon',
			sourceId: 'system',
			sampledAt: 789,
			status: 'warning',
			value: {
				averageCelsius: 54,
				peakCelsius: 60,
				primaryCelsius: 58,
				primaryLabel: 'Package id 0',
				sensors: [
					{
						criticalCelsius: 100,
						deviceName: 'coretemp',
						id: 'package',
						label: 'Package id 0',
						maximumCelsius: 90,
						valueCelsius: 58,
					},
				],
			},
		};
		expect(createTemperaturePageModel(sample)).toMatchObject({
			average: '54.0 °C',
			badge: '1 个传感器',
			peak: '60.0 °C',
			primary: '58.0 °C',
			sensors: [
				{
					id: 'package',
					label: 'Package id 0',
					value: '58.0 °C',
				},
			],
			status: 'warning',
		});
		expect(calculateTemperatureColumnCount(16, 850)).toBe(1);
		expect(calculateTemperatureColumnCount(32, 850)).toBe(2);
	});

	it('formats every fan and preserves the selected primary fan', () => {
		const sample: MetricSample<'fan.hwmon'> = {
			metricId: 'fan.hwmon',
			sourceId: 'system',
			sampledAt: 999,
			status: 'normal',
			value: {
				averageRpm: 2350,
				peakRpm: 2500,
				primaryLabel: 'cpu_fan',
				primaryRpm: 2200,
				sensors: [
					{ deviceName: 'asus', id: 'cpu', label: 'cpu_fan', rpm: 2200 },
					{ deviceName: 'asus', id: 'gpu', label: 'gpu_fan', rpm: 2500 },
				],
			},
		};
		expect(createFanPageModel(sample)).toMatchObject({
			average: '2350 RPM',
			badge: '2 个风扇',
			peak: '2500 RPM',
			primary: '2200 RPM',
			sensors: [
				{ id: 'cpu', label: 'cpu_fan', value: '2200 RPM' },
				{ id: 'gpu', label: 'gpu_fan', value: '2500 RPM' },
			],
		});
	});
});
