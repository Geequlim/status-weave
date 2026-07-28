import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeCommand, readTextFile } = vi.hoisted(() => ({
	executeCommand: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('../../src/platform/runtime', () => ({ executeCommand, readTextFile }));

import { SystemProvider } from '../../src/telemetry/providers/system-provider';
import { StatusProvider } from '../../src/telemetry/providers/status-provider';

const cpuStat = `cpu 100 0 50 800 0 0 0 0 0 0
cpu0 50 0 25 400 0 0 0 0 0 0
`;

const memoryInfo = `MemTotal: 8000000 kB
MemFree: 1000000 kB
MemAvailable: 4000000 kB
Buffers: 100000 kB
Cached: 2000000 kB
SReclaimable: 200000 kB
Shmem: 50000 kB
SwapTotal: 2000000 kB
SwapFree: 1500000 kB
`;

const memoryHardware = `E: MEMORY_DEVICE_0_TYPE=LPDDR5
E: MEMORY_DEVICE_0_MANUFACTURER=SK Hynix
E: MEMORY_DEVICE_0_CONFIGURED_SPEED_MTS=8533
`;

describe('SystemProvider', () => {
	beforeEach(() => {
		executeCommand.mockReset();
		executeCommand.mockResolvedValue(memoryHardware);
		readTextFile.mockReset();
		readTextFile.mockImplementation(async (path: string) =>
			path === '/proc/stat'
				? cpuStat
				: path === '/proc/cpuinfo'
					? 'model name : Intel(R) Core(TM) Ultra 9 386H\n'
					: path === '/proc/meminfo'
						? memoryInfo
						: '2400000\n',
		);
	});

	it('reads only the proc sources required by active metrics', async () => {
		const provider = new SystemProvider();

		const cpu = await provider.sample(new Set(['cpu.usage']));
		expect(readTextFile).toHaveBeenCalledTimes(3);
		expect(readTextFile).toHaveBeenCalledWith('/proc/stat');
		expect(readTextFile).toHaveBeenCalledWith('/proc/cpuinfo');
		expect(readTextFile).toHaveBeenCalledWith(
			'/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
		);
		expect(cpu.samples.map((sample) => sample.metricId)).toEqual(['cpu.usage']);
		expect(cpu.hardware?.cpu?.modelName).toBe('Intel Core Ultra 9 386H');
		const nextCpu = await provider.sample(new Set(['cpu.usage']));
		expect(nextCpu.samples[0]?.value).toMatchObject({
			cores: [{ frequencyHertz: 2_400_000_000 }],
		});

		readTextFile.mockClear();
		const memory = await provider.sample(new Set(['memory.usage']));
		expect(readTextFile).toHaveBeenCalledTimes(1);
		expect(readTextFile).toHaveBeenCalledWith('/proc/meminfo');
		expect(executeCommand).toHaveBeenCalledWith('udevadm', [
			'info',
			'-p',
			'/sys/devices/virtual/dmi/id',
		]);
		expect(memory.samples.map((sample) => sample.metricId)).toEqual(['memory.usage']);
		expect(memory.hardware?.memory).toEqual({
			configuredSpeedMegatransfersPerSecond: 8533,
			manufacturer: 'SK Hynix',
			type: 'LPDDR5',
		});
	});

	it('performs no proc reads when no metric is active', async () => {
		const snapshot = await new SystemProvider().sample(new Set());
		expect(executeCommand).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
		expect(snapshot.samples).toEqual([]);
	});

	it('samples the development metric without touching proc or hardware commands', async () => {
		const snapshot = await new StatusProvider().sample(new Set(['demo.status']));
		expect(readTextFile).not.toHaveBeenCalled();
		expect(executeCommand).not.toHaveBeenCalled();
		expect(snapshot.samples).toEqual([
			expect.objectContaining({
				metricId: 'demo.status',
				sourceId: 'synthetic',
				status: 'normal',
				value: expect.objectContaining({ percentage: 42 }),
			}),
		]);
	});
});
