import { describe, expect, it } from 'vitest';
import { HistoryBuffer } from '../../src/telemetry/history/history-buffer';
import { MetricHistoryStore } from '../../src/telemetry/history/metric-history-store';

describe('HistoryBuffer', () => {
	it('keeps a fixed number of samples in chronological order', () => {
		const history = new HistoryBuffer<{ sampledAt: number; value: number }>({
			maxAgeMilliseconds: 1000,
			maxSamples: 3,
		});
		for (let value = 1; value <= 5; value += 1) {
			history.append({ sampledAt: value * 10, value });
		}
		expect(history.query().map((sample) => sample.value)).toEqual([3, 4, 5]);
	});

	it('evicts expired samples and supports time-range queries', () => {
		const history = new HistoryBuffer<{ sampledAt: number; value: number }>({
			maxAgeMilliseconds: 100,
			maxSamples: 10,
		});
		history.append({ sampledAt: 0, value: 1 });
		history.append({ sampledAt: 50, value: 2 });
		history.append({ sampledAt: 150, value: 3 });
		expect(history.query()).toEqual([
			{ sampledAt: 50, value: 2 },
			{ sampledAt: 150, value: 3 },
		]);
		expect(history.query(100, 200)).toEqual([{ sampledAt: 150, value: 3 }]);
	});

	it('keeps separate histories for each metric source and preserves gaps', () => {
		const history = new MetricHistoryStore({
			maxAgeMilliseconds: 1000,
			maxSamples: 10,
		});
		history.record({
			metricId: 'cpu.usage',
			sourceId: 'system',
			sampledAt: 1,
			status: 'normal',
			value: { overallUsagePercent: 10, cores: [] },
		});
		history.record({
			metricId: 'cpu.usage',
			sourceId: 'system',
			sampledAt: 2,
			status: 'unavailable',
			value: null,
			error: 'CPU: unavailable',
		});
		history.record({
			metricId: 'cpu.usage',
			sourceId: 'other',
			sampledAt: 2,
			status: 'normal',
			value: { overallUsagePercent: 20, cores: [] },
		});

		expect(history.query({ metricId: 'cpu.usage', sourceId: 'system' })).toHaveLength(2);
		expect(history.query({ metricId: 'cpu.usage', sourceId: 'system' })[1]?.status).toBe(
			'unavailable',
		);
		expect(history.query({ metricId: 'cpu.usage', sourceId: 'other' })).toHaveLength(1);
	});
});
