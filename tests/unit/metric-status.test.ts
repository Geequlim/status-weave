import { describe, expect, it } from 'vitest';
import { usageStatus } from '../../src/telemetry/metrics/metric-status';
import { DemoStatusProvider } from '../../src/telemetry/providers/demo-status-provider';

describe('metric status', () => {
	it('classifies percentage thresholds consistently', () => {
		expect(usageStatus(74.9)).toBe('normal');
		expect(usageStatus(75)).toBe('warning');
		expect(usageStatus(89.9)).toBe('warning');
		expect(usageStatus(90)).toBe('critical');
	});

	it('cycles the synthetic metric through every presentation state', () => {
		const provider = new DemoStatusProvider();
		expect(Array.from({ length: 5 }, (_, index) => provider.sample(index).status)).toEqual([
			'normal',
			'warning',
			'critical',
			'unavailable',
			'waiting',
		]);
		provider.reset();
		expect(provider.sample(10)).toMatchObject({
			status: 'normal',
			value: { percentage: 42 },
		});
	});
});
