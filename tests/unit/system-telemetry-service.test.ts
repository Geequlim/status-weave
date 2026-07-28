import { describe, expect, it, vi } from 'vitest';
import {
	SystemTelemetryService,
	type TelemetryScheduler,
} from '../../src/telemetry/system-telemetry-service';
import type { SnapshotProvider } from '../../src/telemetry/providers/system-provider';
import type { TelemetrySnapshot } from '../../src/telemetry/metrics/metric-sample';

const snapshot: TelemetrySnapshot = {
	sampledAt: 1,
	samples: [
		{
			metricId: 'cpu.usage',
			sourceId: 'system',
			sampledAt: 1,
			status: 'normal',
			value: { overallUsagePercent: 25, cores: [] },
		},
	],
};

describe('SystemTelemetryService', () => {
	it('samples the union of visible metrics across instances', async () => {
		const provider: SnapshotProvider = {
			reset: vi.fn(),
			sample: vi.fn(async () => snapshot),
		};
		let scheduledCallback: (() => void) | null = null;
		const scheduler: TelemetryScheduler = {
			cancel: vi.fn(),
			schedule: vi.fn((_milliseconds, callback) => {
				scheduledCallback = callback;
				return 7;
			}),
		};
		const service = new SystemTelemetryService(provider, scheduler, 2000);
		const firstListener = vi.fn();
		const secondListener = vi.fn();

		const firstSubscription = service.subscribe(['cpu.usage'], firstListener);
		const secondSubscription = service.subscribe(['memory.usage'], secondListener);
		await vi.waitFor(() => expect(provider.sample).toHaveBeenCalledTimes(1));
		expect(provider.sample).toHaveBeenNthCalledWith(1, new Set(['cpu.usage']));
		expect(firstListener).toHaveBeenCalledWith(snapshot);
		expect(secondListener).toHaveBeenCalledWith(snapshot);
		expect(service.getHistory({ metricId: 'cpu.usage', sourceId: 'system' })).toHaveLength(1);

		firstSubscription.setMetrics([]);
		if (!scheduledCallback) throw new Error('Expected the next sample to be scheduled');
		scheduledCallback();
		await vi.waitFor(() => expect(provider.sample).toHaveBeenCalledTimes(2));
		expect(provider.sample).toHaveBeenNthCalledWith(2, new Set(['memory.usage']));

		firstSubscription.unsubscribe();
		secondSubscription.unsubscribe();
		expect(scheduler.cancel).toHaveBeenCalledWith(7);
		expect(provider.reset).toHaveBeenCalledOnce();
		expect(scheduledCallback).not.toBeNull();
	});

	it('does not start sampling until an instance requests a metric', async () => {
		const provider: SnapshotProvider = {
			reset: vi.fn(),
			sample: vi.fn(async () => snapshot),
		};
		const scheduler: TelemetryScheduler = {
			cancel: vi.fn(),
			schedule: vi.fn(() => 9),
		};
		const service = new SystemTelemetryService(provider, scheduler);
		const subscription = service.subscribe([], vi.fn());

		expect(provider.sample).not.toHaveBeenCalled();
		subscription.setMetrics(['memory.usage']);
		await vi.waitFor(() => expect(provider.sample).toHaveBeenCalledOnce());
		expect(provider.sample).toHaveBeenCalledWith(new Set(['memory.usage']));

		subscription.setMetrics([]);
		expect(provider.reset).toHaveBeenCalledOnce();
	});
});
