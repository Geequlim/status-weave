import { describe, expect, it } from 'vitest';
import {
	calculateCpuUsage,
	calculateCpuUsageValue,
	parseCpuCounters,
	parseCpuTimes,
	parseMemorySnapshot,
} from '../../src/telemetry/providers/proc-parser';

describe('proc parsers', () => {
	it('calculates aggregate CPU usage from two samples', () => {
		const previous = parseCpuTimes('cpu  100 0 50 800 50 0 0 0 0 0\n');
		const current = parseCpuTimes('cpu  150 0 70 860 60 0 0 0 0 0\n');

		expect(calculateCpuUsage(previous, current)).toBeCloseTo(50);
	});

	it('calculates aggregate and per-core CPU usage from one proc read', () => {
		const previous = parseCpuCounters('cpu  100 0 0 900\ncpu0 40 0 0 460\ncpu1 60 0 0 440\n');
		const current = parseCpuCounters('cpu  160 0 0 940\ncpu0 60 0 0 480\ncpu1 100 0 0 460\n');
		expect(
			calculateCpuUsageValue(
				previous,
				current,
				new Map([
					[0, 2_000_000_000],
					[1, 3_500_000_000],
				]),
			),
		).toEqual({
			overallUsagePercent: 60,
			cores: [
				{ frequencyHertz: 2_000_000_000, id: 'cpu0', index: 0, usagePercent: 50 },
				{
					frequencyHertz: 3_500_000_000,
					id: 'cpu1',
					index: 1,
					usagePercent: expect.closeTo(66.666, 2),
				},
			],
		});
	});

	it('parses used memory from MemAvailable', () => {
		const memory = parseMemorySnapshot(`
MemTotal:       32768000 kB
MemFree:         1000000 kB
MemAvailable:   24576000 kB
Buffers:          100000 kB
Cached:          4000000 kB
SReclaimable:     200000 kB
Shmem:             50000 kB
SwapTotal:        2000000 kB
SwapFree:         1500000 kB
`);

		expect(memory.totalBytes).toBe(32768000 * 1024);
		expect(memory.usedBytes).toBe(8192000 * 1024);
		expect(memory.usagePercent).toBe(25);
		expect(memory.cachedBytes).toBe(4000000 * 1024);
		expect(memory.reclaimableBytes).toBe(200000 * 1024);
		expect(memory.sharedBytes).toBe(50000 * 1024);
		expect(memory.swapUsedBytes).toBe(500000 * 1024);
	});

	it('rejects incomplete proc input', () => {
		expect(() => parseCpuTimes('cpu0 1 2 3 4')).toThrow('Missing aggregate CPU counters');
		expect(() => parseMemorySnapshot('MemTotal: 1000 kB')).toThrow(
			'Missing or invalid memory counters',
		);
	});
});
