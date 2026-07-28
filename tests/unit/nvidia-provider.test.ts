import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeCommand, readTextFile } = vi.hoisted(() => ({
	executeCommand: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('../../src/platform/runtime', () => ({ executeCommand, readTextFile }));

import {
	gpuStatus,
	NvidiaProvider,
	parseNvidiaCsv,
} from '../../src/telemetry/providers/nvidia-provider';

const nvidiaOutput =
	'0, GPU-example, 00000000:01:00.0, NVIDIA GeForce RTX 5070 Ti Laptop GPU, 610.43.03, 9, 1352, 12227, 42, 22.75, [N/A], 1027, 9001, P4\n';

describe('NvidiaProvider', () => {
	beforeEach(() => {
		executeCommand.mockReset();
		executeCommand.mockResolvedValue(nvidiaOutput);
		readTextFile.mockReset();
	});

	it('does not execute nvidia-smi unless the GPU metric is active', async () => {
		expect((await new NvidiaProvider().sample(new Set())).samples).toEqual([]);
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('queries every panel and detail field in one command', async () => {
		const snapshot = await new NvidiaProvider().sample(new Set(['gpu.device']));
		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(snapshot.samples).toEqual([
			expect.objectContaining({
				metricId: 'gpu.device',
				sourceId: 'nvidia:0',
				status: 'normal',
				value: expect.objectContaining({
					deviceId: 'GPU-example',
					graphicsClockHertz: 1_027_000_000,
					memoryTotalBytes: 12_227 * 1024 ** 2,
					memoryUsedBytes: 1_352 * 1024 ** 2,
					name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU',
					pciBusId: '0000:01:00.0',
					powerLimitWatts: null,
					powerWatts: 22.75,
					temperatureCelsius: 42,
					utilizationPercent: 9,
				}),
			}),
		]);
	});

	it('reports a known device as sleeping after a query failure', async () => {
		const provider = new NvidiaProvider();
		await provider.sample(new Set(['gpu.device']));
		executeCommand.mockRejectedValueOnce(new Error('GPU is asleep'));
		readTextFile.mockResolvedValue('suspended\n');
		const snapshot = await provider.sample(new Set(['gpu.device']));
		expect(snapshot.samples[0]).toMatchObject({
			metricId: 'gpu.device',
			sourceId: 'nvidia:0',
			status: 'sleeping',
			value: {
				operationalState: 'sleeping',
				temperatureCelsius: null,
				utilizationPercent: null,
			},
		});
	});
});

describe('NVIDIA parsing and status', () => {
	it('rejects malformed rows instead of shifting fields', () => {
		expect(() => parseNvidiaCsv('0, incomplete')).toThrow('Unexpected NVIDIA field count');
	});

	it('uses GPU temperature rather than utilization for alerts', () => {
		const value = parseNvidiaCsv(nvidiaOutput)[0]!;
		expect(gpuStatus({ ...value, temperatureCelsius: 80, utilizationPercent: 100 })).toBe(
			'warning',
		);
		expect(gpuStatus({ ...value, temperatureCelsius: 90 })).toBe('critical');
		expect(gpuStatus({ ...value, temperatureCelsius: 70, utilizationPercent: 100 })).toBe(
			'normal',
		);
	});
});
